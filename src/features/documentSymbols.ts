import type {
  SemanticRange,
  SemanticScope,
  SemanticSymbol,
  SemanticSymbolKind,
} from '../semantic/index.js';

import type { DocumentSymbolKind, DocumentSymbolResult, FeatureContext } from './types.js';

function documentSymbolKind(kind: SemanticSymbolKind): DocumentSymbolKind | undefined {
  switch (kind) {
    case 'variable':
    case 'function':
    case 'parameter':
    case 'import':
      return kind;
    case 'activePattern':
      return 'variable';
    default:
      return undefined;
  }
}

function containsRange(outer: SemanticRange, inner: SemanticRange): boolean {
  return inner.startOffset >= outer.startOffset && inner.endOffset <= outer.endOffset;
}

function declarationIsCurrent(context: FeatureContext, symbol: SemanticSymbol): boolean {
  const declaration = symbol.declaration;
  return (
    declaration !== undefined &&
    context.text.slice(declaration.startOffset, declaration.endOffset) === symbol.name
  );
}

function ownerFunctionScope(
  context: FeatureContext,
  symbol: SemanticSymbol,
): SemanticScope | undefined {
  const declaration = symbol.declaration;
  if (symbol.kind !== 'function' || declaration === undefined) {
    return undefined;
  }

  let best: SemanticScope | undefined;
  for (const scope of context.semantic.scopes.values()) {
    if (scope.kind !== 'function' || scope.parentId !== symbol.scopeId) {
      continue;
    }
    if (!containsRange(scope.range, declaration)) {
      continue;
    }
    const size = scope.range.endOffset - scope.range.startOffset;
    const bestSize =
      best === undefined ? Number.POSITIVE_INFINITY : best.range.endOffset - best.range.startOffset;
    if (size < bestSize) {
      best = scope;
    }
  }
  return best;
}

function buildSymbols(
  context: FeatureContext,
  scopeId: string,
  visited: Set<string>,
): DocumentSymbolResult[] {
  if (visited.has(scopeId)) {
    return [];
  }
  visited.add(scopeId);

  const scope = context.semantic.scopes.get(scopeId);
  if (scope === undefined) {
    return [];
  }

  const symbols: DocumentSymbolResult[] = [];
  const ownedScopeIds = new Set<string>();

  for (const symbolId of scope.symbolIds) {
    const symbol = context.semantic.symbols.get(symbolId);
    const kind = symbol === undefined ? undefined : documentSymbolKind(symbol.kind);
    if (
      symbol === undefined ||
      kind === undefined ||
      symbol.declaration === undefined ||
      !declarationIsCurrent(context, symbol)
    ) {
      continue;
    }

    const ownerScope = ownerFunctionScope(context, symbol);
    if (ownerScope !== undefined) {
      ownedScopeIds.add(ownerScope.id);
    }
    symbols.push({
      name: symbol.name,
      kind,
      symbolId: symbol.id,
      detail: symbol.type.kind,
      range: ownerScope?.range ?? symbol.declaration,
      selectionRange: symbol.declaration,
      children: ownerScope === undefined ? [] : buildSymbols(context, ownerScope.id, visited),
    });
  }

  // Scopes without a declared function owner have no outline heading. Keep
  // their declarations visible at the enclosing level instead of dropping them.
  for (const childId of new Set(scope.childIds)) {
    if (!ownedScopeIds.has(childId)) {
      symbols.push(...buildSymbols(context, childId, visited));
    }
  }

  return symbols.sort(
    (left, right) =>
      left.selectionRange.startOffset - right.selectionRange.startOffset ||
      left.name.localeCompare(right.name),
  );
}

export function provideDocumentSymbols(context: FeatureContext): readonly DocumentSymbolResult[] {
  return buildSymbols(context, context.semantic.rootScopeId, new Set<string>());
}
