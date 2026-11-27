import type { SemanticRange, SemanticScope, SemanticSymbol } from '../semantic/index.js';

import { findSymbolAtOffset } from './navigation.js';
import type {
  CallHierarchyCallResult,
  CallHierarchyData,
  CallHierarchyItemResult,
  FeatureContext,
} from './types.js';

function toSemanticRange(range: SemanticRange): SemanticRange {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
    startOffset: range.startOffset,
    endOffset: range.endOffset,
  };
}

function declarationIsCurrent(context: FeatureContext, symbol: SemanticSymbol): boolean {
  const declaration = symbol.declaration;
  return (
    declaration !== undefined &&
    context.text.slice(declaration.startOffset, declaration.endOffset) === symbol.name
  );
}

function containsRange(outer: SemanticRange, inner: SemanticRange): boolean {
  return inner.startOffset >= outer.startOffset && inner.endOffset <= outer.endOffset;
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
    if (
      scope.kind !== 'function' ||
      scope.parentId !== symbol.scopeId ||
      !containsRange(scope.range, declaration)
    ) {
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

function itemForFunction(
  context: FeatureContext,
  symbol: SemanticSymbol,
): CallHierarchyItemResult | undefined {
  const declaration = symbol.declaration;
  if (
    symbol.kind !== 'function' ||
    declaration === undefined ||
    !declarationIsCurrent(context, symbol)
  ) {
    return undefined;
  }

  const data: CallHierarchyData = Object.freeze({
    version: context.semantic.version,
    uri: context.uri,
    symbolId: symbol.id,
    name: symbol.name,
  });
  return {
    uri: context.uri,
    name: symbol.name,
    kind: 'function',
    range: toSemanticRange(ownerFunctionScope(context, symbol)?.range ?? declaration),
    selectionRange: toSemanticRange(declaration),
    data,
  };
}

function ownerOfScope(context: FeatureContext, scope: SemanticScope): SemanticSymbol | undefined {
  for (const symbol of context.semantic.symbols.values()) {
    if (
      symbol.kind === 'function' &&
      scope.kind === 'function' &&
      scope.parentId === symbol.scopeId &&
      symbol.declaration !== undefined &&
      containsRange(scope.range, symbol.declaration) &&
      declarationIsCurrent(context, symbol)
    ) {
      return symbol;
    }
  }
  return undefined;
}

function callerItem(
  context: FeatureContext,
  referenceScopeId: string,
): CallHierarchyItemResult | undefined {
  let scope: SemanticScope | undefined = context.semantic.scopes.get(referenceScopeId);
  while (scope !== undefined) {
    const owner = ownerOfScope(context, scope);
    if (owner !== undefined) {
      return itemForFunction(context, owner);
    }
    scope = scope.parentId === undefined ? undefined : context.semantic.scopes.get(scope.parentId);
  }
  return undefined;
}

function nestedScopeIds(context: FeatureContext, rootScopeId: string): ReadonlySet<string> {
  const ids = new Set<string>();
  const visit = (scopeId: string): void => {
    if (ids.has(scopeId)) {
      return;
    }
    ids.add(scopeId);
    const scope = context.semantic.scopes.get(scopeId);
    for (const childId of scope?.childIds ?? []) {
      visit(childId);
    }
  };
  visit(rootScopeId);
  return ids;
}

/** Prepares call hierarchy items only for verified user function declarations. */
export function prepareCallHierarchy(
  context: FeatureContext,
  offset: number,
): readonly CallHierarchyItemResult[] {
  if (context.syntax.hasErrors) {
    return [];
  }
  const found = findSymbolAtOffset(context, offset);
  if (found === undefined) {
    return [];
  }
  const item = itemForFunction(context, found.symbol);
  return item === undefined ? [] : [item];
}

/**
 * Builds incoming or outgoing call edges from resolved user-function calls.
 * A stale or malformed item token is rejected instead of being trusted.
 */
export function provideCallHierarchyCalls(
  context: FeatureContext,
  item: CallHierarchyData,
  direction: 'incoming' | 'outgoing',
): readonly CallHierarchyCallResult[] {
  if (context.syntax.hasErrors) {
    return [];
  }
  if (
    item.version !== context.semantic.version ||
    item.uri !== context.uri ||
    typeof item.symbolId !== 'string'
  ) {
    return [];
  }
  const symbol = context.semantic.symbols.get(item.symbolId);
  if (symbol === undefined) {
    return [];
  }
  if (symbol.name !== item.name || !declarationIsCurrent(context, symbol)) {
    return [];
  }

  const calls: CallHierarchyCallResult[] = [];
  const seen = new Set<string>();
  const add = (from: CallHierarchyItemResult | undefined, range: SemanticRange): void => {
    if (from === undefined) {
      return;
    }
    const key = `${from.data.symbolId}:${range.startOffset}:${range.endOffset}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    calls.push({ from, fromRanges: [toSemanticRange(range)] });
  };

  if (direction === 'incoming') {
    for (const reference of context.semantic.references) {
      if (reference.kind === 'call' && reference.resolvedSymbolId === symbol.id) {
        add(callerItem(context, reference.scopeId), reference.range);
      }
    }
    return calls.sort(
      (left, right) =>
        (left.fromRanges[0]?.startOffset ?? 0) - (right.fromRanges[0]?.startOffset ?? 0),
    );
  }

  const scope = ownerFunctionScope(context, symbol);
  if (scope === undefined) {
    return [];
  }
  const scopeIds = nestedScopeIds(context, scope.id);
  for (const reference of context.semantic.references) {
    if (reference.kind !== 'call' || !scopeIds.has(reference.scopeId)) {
      continue;
    }
    const target =
      reference.resolvedSymbolId === undefined
        ? undefined
        : context.semantic.symbols.get(reference.resolvedSymbolId);
    if (target === undefined) {
      continue;
    }
    add(itemForFunction(context, target), reference.range);
  }
  return calls.sort(
    (left, right) =>
      (left.fromRanges[0]?.startOffset ?? 0) - (right.fromRanges[0]?.startOffset ?? 0),
  );
}
