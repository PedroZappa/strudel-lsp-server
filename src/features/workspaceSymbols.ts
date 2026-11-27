import { provideDocumentSymbols } from './documentSymbols.js';
import type { DocumentSymbolResult, FeatureContext, WorkspaceSymbolResult } from './types.js';

const DEFAULT_RESULT_LIMIT = 500;

/**
 * LSP workspace-symbol queries use relaxed, case-insensitive subsequence
 * matching rather than strict prefix or substring matching.
 */
function matchesQuery(query: string, name: string): boolean {
  const needle = query.toLowerCase();
  if (needle.length === 0) {
    return true;
  }

  const haystack = name.toLowerCase();
  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) {
      index += 1;
      if (index === needle.length) {
        return true;
      }
    }
  }
  return false;
}

function collectSymbols(
  results: WorkspaceSymbolResult[],
  context: FeatureContext,
  symbols: readonly DocumentSymbolResult[],
  query: string,
  containerName: string | undefined,
): void {
  const metadataVersion = context.database.getSnapshot().catalogVersion;
  for (const symbol of symbols) {
    if (matchesQuery(query, symbol.name)) {
      results.push({
        name: symbol.name,
        kind: symbol.kind,
        uri: context.uri,
        range: symbol.selectionRange,
        containerName,
        data: Object.freeze({
          metadataVersion,
          name: symbol.name,
          kind: symbol.kind,
          range: symbol.selectionRange,
        }),
      });
    }
    collectSymbols(results, context, symbol.children, query, symbol.name);
  }
}

/**
 * Flattens verified document outlines from a set of workspace documents. The
 * caller owns file discovery and decides which documents are in scope.
 */
export function provideWorkspaceSymbols(
  contexts: readonly FeatureContext[],
  query: string,
  limit: number = DEFAULT_RESULT_LIMIT,
): readonly WorkspaceSymbolResult[] {
  const results: WorkspaceSymbolResult[] = [];

  for (const context of contexts) {
    collectSymbols(results, context, provideDocumentSymbols(context), query, undefined);
  }

  return results
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.uri.localeCompare(right.uri) ||
        left.range.startOffset - right.range.startOffset ||
        (left.containerName ?? '').localeCompare(right.containerName ?? ''),
    )
    .slice(0, Math.max(0, limit));
}
