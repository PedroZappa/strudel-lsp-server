import type { LanguageDatabase, LanguageMetadataRecord } from '../languageDatabase/index.js';
import type { SemanticRange } from '../semantic/index.js';

import { recordDocumentation } from './metadata.js';
import type {
  CompletionResolveData,
  CompletionResolveInput,
  CompletionResolveResult,
  DocumentSymbolKind,
  WorkspaceSymbolResolveInput,
  WorkspaceSymbolResolveResult,
} from './types.js';

const DOCUMENT_SYMBOL_KINDS: readonly DocumentSymbolKind[] = [
  'variable',
  'function',
  'parameter',
  'import',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCoordinate(value: unknown): value is { line: number; character: number } {
  return (
    isRecord(value) &&
    Number.isInteger(value.line) &&
    Number.isInteger(value.character) &&
    (value.line as number) >= 0 &&
    (value.character as number) >= 0
  );
}

function isSemanticRange(value: unknown): value is SemanticRange {
  return (
    isRecord(value) &&
    isCoordinate(value.start) &&
    isCoordinate(value.end) &&
    Number.isInteger(value.startOffset) &&
    Number.isInteger(value.endOffset) &&
    (value.startOffset as number) >= 0 &&
    (value.endOffset as number) >= (value.startOffset as number)
  );
}

function validToken(value: unknown, name: string, database: LanguageDatabase): boolean {
  return (
    isRecord(value) &&
    value.name === name &&
    value.metadataVersion === database.getSnapshot().catalogVersion
  );
}

function completionDetail(record: LanguageMetadataRecord): string {
  const signature = record.signatures?.[0];
  return signature?.label ?? record.returnType;
}

function completionDocumentation(record: LanguageMetadataRecord): string | undefined {
  const sections: string[] = [];
  const signature = record.signatures?.[0];

  if (signature !== undefined) {
    sections.push(['```js', signature.label, '```'].join('\n'));
    if (signature.documentation !== undefined && signature.documentation !== '') {
      sections.push(signature.documentation);
    }
    const parameters = signature.parameters.filter(
      (parameter) => parameter.documentation !== undefined && parameter.documentation !== '',
    );
    if (parameters.length > 0) {
      sections.push(
        [
          'Parameters:',
          ...parameters.map(
            (parameter) => `- \`${parameter.label}\`: ${parameter.documentation ?? ''}`,
          ),
        ].join('\n'),
      );
    }
  }

  const base = recordDocumentation(record);
  if (base !== undefined) {
    sections.push(base);
  }
  if (record.aliasOf !== undefined) {
    sections.push(`_Alias of \`${record.aliasOf}\`_`);
  }

  return sections.length === 0 ? undefined : sections.join('\n\n');
}

function completionRecord(
  data: CompletionResolveData,
  database: LanguageDatabase,
): LanguageMetadataRecord | undefined {
  switch (data.recordKind) {
    case 'global':
      return database.getGlobalRecord(data.name);
    case 'method':
      return database.getMethodRecord(data.name);
  }
}

/**
 * Resolves a completion token against the current pinned metadata snapshot.
 * Tokens from another snapshot, tokens whose name does not match the item, and
 * malformed tokens produce no enrichment rather than guessing.
 */
export function resolveCompletion(
  input: CompletionResolveInput,
  database: LanguageDatabase,
): CompletionResolveResult {
  if (!validToken(input.data, input.label, database) || !isRecord(input.data)) {
    return {};
  }
  const data = input.data;
  if (data.recordKind !== 'global' && data.recordKind !== 'method') {
    return {};
  }
  const record = completionRecord(
    {
      metadataVersion: String(data.metadataVersion),
      name: input.label,
      recordKind: data.recordKind,
    },
    database,
  );
  if (record === undefined) {
    return {};
  }
  return {
    detail: completionDetail(record),
    documentation: completionDocumentation(record),
  };
}

/**
 * Resolves a workspace-symbol location from the opaque token produced by the
 * bounded query. It reopens no file; stale, malformed or mismatched tokens are
 * rejected instead of being trusted.
 */
export function resolveWorkspaceSymbol(
  input: WorkspaceSymbolResolveInput,
  database: LanguageDatabase,
): WorkspaceSymbolResolveResult {
  if (!validToken(input.data, input.name, database) || !isRecord(input.data)) {
    return {};
  }
  const data = input.data;
  if (
    typeof data.kind !== 'string' ||
    !DOCUMENT_SYMBOL_KINDS.some((kind) => kind === data.kind) ||
    !isSemanticRange(data.range)
  ) {
    return {};
  }
  return { range: data.range };
}
