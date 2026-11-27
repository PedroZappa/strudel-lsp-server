import type {
  SemanticDocument,
  SemanticReference,
  SemanticScope,
  SemanticSymbol,
  StrudelType,
} from './types.js';

function containsOffset(
  range: { startOffset: number; endOffset: number },
  offset: number,
): boolean {
  return offset >= range.startOffset && offset < range.endOffset;
}

export function findScopeAt(document: SemanticDocument, offset: number): SemanticScope | undefined {
  let best: SemanticScope | undefined;
  for (const scope of document.scopes.values()) {
    if (containsOffset(scope.range, offset)) {
      if (best === undefined || scope.range.startOffset >= best.range.startOffset) {
        best = scope;
      }
    }
  }
  return best ?? document.scopes.get(document.rootScopeId);
}

export function findReferenceAt(
  document: SemanticDocument,
  offset: number,
): SemanticReference | undefined {
  return document.references.find((reference) => containsOffset(reference.range, offset));
}

export function findSymbolAt(
  document: SemanticDocument,
  offset: number,
): SemanticSymbol | undefined {
  for (const symbol of document.symbols.values()) {
    if (symbol.declaration !== undefined && containsOffset(symbol.declaration, offset)) {
      return symbol;
    }
  }
  return undefined;
}

export function resolveReference(
  document: SemanticDocument,
  reference: SemanticReference,
): SemanticSymbol | undefined {
  if (reference.resolvedSymbolId === undefined) {
    return undefined;
  }
  return document.symbols.get(reference.resolvedSymbolId);
}

export function typeOfReference(
  document: SemanticDocument,
  reference: SemanticReference,
): StrudelType | undefined {
  return resolveReference(document, reference)?.type;
}
