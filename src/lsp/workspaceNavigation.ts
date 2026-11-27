import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { FeatureContext, WorkspaceLocationResult } from '../features/index.js';
import { findSymbolAtOffset, provideReferences } from '../features/index.js';
import type { SemanticRange, SemanticSymbol } from '../semantic/index.js';
import type { SyntaxNode } from '../syntax/index.js';

interface ImportBinding {
  readonly localName: string;
  readonly importedName: string;
  readonly targetUri: string | undefined;
  readonly symbol: SemanticSymbol | undefined;
  readonly declaration: SemanticRange;
}

function descendants(node: SyntaxNode): SyntaxNode[] {
  const nodes: SyntaxNode[] = [node];
  for (const child of node.children) {
    nodes.push(...descendants(child));
  }
  return nodes;
}

function findNodes(root: SyntaxNode, kind: string): SyntaxNode[] {
  return descendants(root).filter((node) => node.kind === kind);
}

function sameRange(left: SemanticRange, right: SemanticRange): boolean {
  return left.startOffset === right.startOffset && left.endOffset === right.endOffset;
}

function resolveImportUri(fromUri: string, specifier: string): string | undefined {
  if (!specifier.endsWith('.strudel') || specifier.includes('\0') || specifier.startsWith('/')) {
    return undefined;
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(specifier)) {
    return undefined;
  }
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return undefined;
  }

  let fromPath: string;
  try {
    fromPath = fileURLToPath(fromUri);
  } catch {
    return undefined;
  }
  return pathToFileURL(resolve(dirname(fromPath), specifier)).href;
}

function importBindings(context: FeatureContext): readonly ImportBinding[] {
  const bindings: ImportBinding[] = [];
  for (const node of findNodes(context.syntax.root, 'importSpecifier')) {
    const identifiers = findNodes(node, 'identifier');
    const localNode = identifiers[identifiers.length - 1];
    if (localNode === undefined) {
      continue;
    }
    const declaration: SemanticRange = {
      start: { line: localNode.range.start.line, character: localNode.range.start.character },
      end: { line: localNode.range.end.line, character: localNode.range.end.character },
      startOffset: localNode.range.startOffset,
      endOffset: localNode.range.endOffset,
    };
    const symbol = [...context.semantic.symbols.values()].find(
      (candidate) =>
        candidate.kind === 'import' &&
        candidate.declaration !== undefined &&
        sameRange(candidate.declaration, declaration),
    );
    const importDeclaration = findNodes(context.syntax.root, 'importDeclaration').find(
      (candidate) => descendants(candidate).includes(node),
    );
    const specifierNode =
      importDeclaration === undefined ? undefined : findNodes(importDeclaration, 'string')[0];
    const specifierText = specifierNode?.text ?? '';
    const specifier =
      specifierText.length >= 2 && specifierText.startsWith('"') && specifierText.endsWith('"')
        ? specifierText.slice(1, -1)
        : undefined;

    bindings.push({
      localName: localNode.text,
      importedName: identifiers[0]?.text ?? localNode.text,
      targetUri: specifier === undefined ? undefined : resolveImportUri(context.uri, specifier),
      symbol,
      declaration,
    });
  }
  return bindings;
}

function bindingAtOffset(context: FeatureContext, offset: number): ImportBinding | undefined {
  const found = findSymbolAtOffset(context, offset);
  if (found?.symbol.kind !== 'import') {
    return undefined;
  }
  return importBindings(context).find((binding) => sameRange(binding.declaration, found.range));
}

function isExportedDeclaration(context: FeatureContext, declaration: SemanticRange): boolean {
  return findNodes(context.syntax.root, 'exportDeclaration').some((node) =>
    descendants(node).some(
      (child) =>
        child.range.startOffset === declaration.startOffset &&
        child.range.endOffset === declaration.endOffset,
    ),
  );
}

function exportedSymbol(
  context: FeatureContext | undefined,
  name: string,
): SemanticSymbol | undefined {
  if (context === undefined) {
    return undefined;
  }
  for (const symbol of context.semantic.symbols.values()) {
    if (
      symbol.name === name &&
      (symbol.kind === 'variable' || symbol.kind === 'function') &&
      symbol.declaration !== undefined &&
      context.text.slice(symbol.declaration.startOffset, symbol.declaration.endOffset) === name &&
      isExportedDeclaration(context, symbol.declaration)
    ) {
      return symbol;
    }
  }
  return undefined;
}

function contextByUri(
  contexts: readonly FeatureContext[],
  uri: string | undefined,
): FeatureContext | undefined {
  return uri === undefined ? undefined : contexts.find((context) => context.uri === uri);
}

function location(uri: string, range: SemanticRange): WorkspaceLocationResult {
  return {
    uri,
    range: {
      start: { line: range.start.line, character: range.start.character },
      end: { line: range.end.line, character: range.end.character },
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    },
  };
}

function addLocation(
  results: WorkspaceLocationResult[],
  seen: Set<string>,
  uri: string,
  range: SemanticRange,
): void {
  const key = `${uri}:${range.startOffset}:${range.endOffset}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  results.push(location(uri, range));
}

function addResolvedReferences(
  results: WorkspaceLocationResult[],
  seen: Set<string>,
  context: FeatureContext,
  symbolId: string,
): void {
  for (const reference of context.semantic.references) {
    if (reference.resolvedSymbolId === symbolId) {
      addLocation(results, seen, context.uri, reference.range);
    }
  }
}

/**
 * Resolves an explicit relative `.strudel` import to an exported declaration
 * among the contexts supplied by the bounded workspace scan. It performs no
 * filesystem access of its own and rejects absolute, remote and non-Strudel
 * specifiers.
 */
export function provideWorkspaceDefinition(
  current: FeatureContext,
  contexts: readonly FeatureContext[],
  offset: number,
): WorkspaceLocationResult | undefined {
  const binding = bindingAtOffset(current, offset);
  if (binding === undefined) {
    return undefined;
  }
  const targetContext = contextByUri(contexts, binding.targetUri);
  const targetSymbol = exportedSymbol(targetContext, binding.importedName);
  if (targetContext === undefined || targetSymbol?.declaration === undefined) {
    return undefined;
  }
  return location(targetContext.uri, targetSymbol.declaration);
}

/**
 * Collects references across the supplied workspace contexts. Cross-file edges
 * are authorized only by an explicit import specifier and a verified exported
 * declaration; unresolved or similarly named symbols are never merged.
 */
export function provideWorkspaceReferences(
  current: FeatureContext,
  contexts: readonly FeatureContext[],
  offset: number,
  includeDeclaration: boolean,
): readonly WorkspaceLocationResult[] {
  const results: WorkspaceLocationResult[] = [];
  const seen = new Set<string>();
  const localReferences = provideReferences(current, offset, includeDeclaration);
  for (const reference of localReferences) {
    addLocation(results, seen, current.uri, reference.range);
  }

  const binding = bindingAtOffset(current, offset);
  if (binding !== undefined) {
    const targetContext = contextByUri(contexts, binding.targetUri);
    const targetSymbol = exportedSymbol(targetContext, binding.importedName);
    if (targetContext !== undefined && targetSymbol?.declaration !== undefined) {
      if (includeDeclaration) {
        addLocation(results, seen, targetContext.uri, targetSymbol.declaration);
      }
      addResolvedReferences(results, seen, targetContext, targetSymbol.id);
      for (const context of contexts) {
        for (const candidate of importBindings(context)) {
          if (
            candidate.targetUri !== targetContext.uri ||
            candidate.importedName !== targetSymbol.name ||
            candidate.symbol === undefined
          ) {
            continue;
          }
          if (includeDeclaration) {
            addLocation(results, seen, context.uri, candidate.declaration);
          }
          addResolvedReferences(results, seen, context, candidate.symbol.id);
        }
      }
    }
    return results;
  }

  const found = findSymbolAtOffset(current, offset);
  if (
    found?.symbol.declaration === undefined ||
    (found.symbol.kind !== 'variable' && found.symbol.kind !== 'function') ||
    !isExportedDeclaration(current, found.symbol.declaration)
  ) {
    return results;
  }

  for (const context of contexts) {
    for (const candidate of importBindings(context)) {
      if (
        candidate.targetUri !== current.uri ||
        candidate.importedName !== found.symbol.name ||
        candidate.symbol === undefined
      ) {
        continue;
      }
      if (includeDeclaration) {
        addLocation(results, seen, context.uri, candidate.declaration);
      }
      addResolvedReferences(results, seen, context, candidate.symbol.id);
    }
  }
  return results;
}
