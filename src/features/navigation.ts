import { findReferenceAt, findSymbolAt, resolveReference } from '../semantic/index.js';

import type {
  DefinitionResult,
  FeatureContext,
  ReferenceResult,
  SymbolLookupResult,
} from './types.js';

export function findSymbolAtOffset(
  context: FeatureContext,
  offset: number,
): SymbolLookupResult | undefined {
  const declared = findSymbolAt(context.semantic, offset);
  if (declared?.declaration !== undefined) {
    return { symbol: declared, range: declared.declaration };
  }

  const reference = declared === undefined ? findReferenceAt(context.semantic, offset) : undefined;
  const symbol =
    declared ??
    (reference === undefined ? undefined : resolveReference(context.semantic, reference));

  if (symbol === undefined || reference === undefined) {
    return undefined;
  }

  return { symbol, range: reference.range };
}

function rangeKey(range: { readonly startOffset: number; readonly endOffset: number }): string {
  return `${range.startOffset}:${range.endOffset}`;
}

export function provideDefinition(
  context: FeatureContext,
  offset: number,
): DefinitionResult | undefined {
  const found = findSymbolAtOffset(context, offset);
  if (found?.symbol.declaration === undefined) {
    return undefined;
  }
  return { range: found.symbol.declaration };
}

export function provideReferences(
  context: FeatureContext,
  offset: number,
  includeDeclaration: boolean,
): readonly ReferenceResult[] {
  const found = findSymbolAtOffset(context, offset);
  if (found === undefined) {
    return [];
  }

  const results: ReferenceResult[] = [];
  const seen = new Set<string>();
  const add = (range: ReferenceResult['range']): void => {
    const key = rangeKey(range);
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ range });
    }
  };

  if (includeDeclaration && found.symbol.declaration !== undefined) {
    add(found.symbol.declaration);
  }

  for (const reference of context.semantic.references) {
    if (reference.resolvedSymbolId === found.symbol.id) {
      add(reference.range);
    }
  }

  return results;
}
