import type { LanguageDatabase, LanguageMetadataRecord } from '../languageDatabase/index.js';
import type { SemanticSymbol, StrudelType } from '../semantic/index.js';

import type { FeatureContext } from './types.js';

export function formatStrudelType(type: StrudelType): string {
  if (type.returnType === undefined) {
    return type.kind;
  }
  return `${type.kind}<${formatStrudelType(type.returnType)}>`;
}

function sortedRecords(
  names: ReadonlySet<string>,
  lookup: (name: string) => LanguageMetadataRecord | undefined,
): readonly LanguageMetadataRecord[] {
  return [...names]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => lookup(name))
    .filter((record): record is LanguageMetadataRecord => record !== undefined);
}

export function listGlobalRecords(database: LanguageDatabase): readonly LanguageMetadataRecord[] {
  const snapshot = database.getSnapshot();
  const names = new Set<string>();

  for (const symbol of snapshot.generated.symbols) {
    if (symbol.scope === 'global') {
      names.add(symbol.name);
    }
  }
  for (const entry of snapshot.runtime) {
    if (entry.kind === 'global') {
      names.add(entry.name);
    }
  }

  return sortedRecords(names, (name) => database.getGlobalRecord(name, snapshot.version));
}

export function listPatternMethodRecords(
  database: LanguageDatabase,
): readonly LanguageMetadataRecord[] {
  const snapshot = database.getSnapshot();
  const names = new Set<string>();

  for (const symbol of snapshot.generated.symbols) {
    if (symbol.memberOf === 'Pattern' && symbol.scope === 'static') {
      names.add(symbol.name);
    }
  }
  for (const entry of snapshot.runtime) {
    if (entry.kind === 'method') {
      names.add(entry.name);
    }
  }

  return sortedRecords(names, (name) => database.getMethodRecord(name, snapshot.version));
}

export function metadataRecordForSymbol(
  context: FeatureContext,
  symbol: SemanticSymbol,
): LanguageMetadataRecord | undefined {
  switch (symbol.kind) {
    case 'builtin':
      return context.database.getGlobalRecord(symbol.name);
    case 'method':
      return context.database.getMethodRecord(symbol.name);
    case 'sample':
      return context.database.getSampleRecord(symbol.name);
    default:
      return undefined;
  }
}

export function recordDocumentation(record: LanguageMetadataRecord): string | undefined {
  const sections: string[] = [];

  if (record.description !== undefined && record.description !== '') {
    sections.push(record.description);
  }

  if (record.examples.length > 0) {
    sections.push(['Examples:', '```js', ...record.examples, '```'].join('\n'));
  }

  if (record.sourceFile !== undefined) {
    const location =
      record.sourceLine === undefined
        ? record.sourceFile
        : `${record.sourceFile}:${record.sourceLine}`;
    sections.push(`_Source: \`${location}\`_`);
  }

  return sections.length === 0 ? undefined : sections.join('\n\n');
}
