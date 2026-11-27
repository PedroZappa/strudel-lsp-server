import { generatedMetadata } from './generated.js';
import { manualSemanticSnapshot } from './manual.js';
import type {
  GeneratedSymbolMetadata,
  LanguageDatabase,
  LanguageDatabaseOptions,
  LanguageDatabaseSnapshot,
  LanguageMetadataRecord,
  LanguageVersionData,
  ManualSemanticEntry,
  RuntimeSymbolMetadata,
} from './types.js';

interface SnapshotIndex {
  readonly snapshot: LanguageDatabaseSnapshot;
  readonly globals: ReadonlyMap<string, LanguageMetadataRecord>;
  readonly methods: ReadonlyMap<string, LanguageMetadataRecord>;
  readonly samples: ReadonlyMap<string, LanguageMetadataRecord>;
}

function hashText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function overrideFor(
  entries: readonly ManualSemanticEntry[],
  longName: string,
): ManualSemanticEntry | undefined {
  return entries.find((entry) => entry.longName === longName);
}

function generatedRecord(
  symbol: GeneratedSymbolMetadata,
  override: ManualSemanticEntry | undefined,
): LanguageMetadataRecord {
  return {
    name: symbol.name,
    longName: symbol.longName,
    origin: override === undefined ? 'generated' : 'manual',
    kind: symbol.kind,
    scope: symbol.scope,
    memberOf: symbol.memberOf,
    returnType: override?.returnType ?? symbol.returnType,
    miniNotationArguments: override?.miniNotationArguments,
    signatures: override?.signatures,
    description: symbol.description,
    examples: symbol.examples,
    parameters: symbol.parameters,
    returns: symbol.returns,
    sourceFile: symbol.sourceFile,
    sourceLine: symbol.sourceLine,
  };
}

function runtimeRecord(entry: RuntimeSymbolMetadata): LanguageMetadataRecord {
  const kind = entry.kind === 'global' ? 'function' : entry.kind === 'method' ? 'member' : 'value';
  return {
    name: entry.name,
    longName: entry.name,
    origin: 'runtime',
    kind,
    scope: entry.kind === 'method' ? 'static' : 'global',
    returnType: entry.returnType,
    miniNotationArguments: entry.miniNotationArguments,
    description: entry.description,
    examples: [],
    parameters: [],
    returns: [],
  };
}

function unambiguousAliases(
  symbols: readonly GeneratedSymbolMetadata[],
  accepts: (symbol: GeneratedSymbolMetadata) => boolean,
): ReadonlyMap<string, string> {
  const owners = new Map<string, Set<string>>();
  for (const symbol of symbols) {
    if (!accepts(symbol)) {
      continue;
    }
    for (const alias of symbol.synonyms) {
      const candidates = owners.get(alias) ?? new Set<string>();
      candidates.add(symbol.longName);
      owners.set(alias, candidates);
    }
  }
  const resolved = new Map<string, string>();
  for (const [alias, candidates] of owners) {
    if (candidates.size === 1) {
      resolved.set(alias, [...candidates][0] ?? '');
    }
  }
  return resolved;
}

function buildIndex(data: LanguageVersionData): SnapshotIndex {
  const generatedSchemaVersion: number = data.generated.schemaVersion;
  const manualSchemaVersion: number = data.manual.schemaVersion;
  if (generatedSchemaVersion !== 1) {
    throw new Error(`Unsupported generated metadata schema: ${generatedSchemaVersion}`);
  }
  if (manualSchemaVersion !== 1) {
    throw new Error(`Unsupported manual metadata schema: ${manualSchemaVersion}`);
  }

  const version = data.generated.id;
  const runtime = [...(data.runtime ?? [])];
  const aliasInputs = data.generated.symbols.map((symbol) => ({
    name: symbol.name,
    longName: symbol.longName,
    scope: symbol.scope,
    memberOf: symbol.memberOf,
    synonyms: symbol.synonyms,
  }));
  const catalogVersion = `${version}:${hashText(
    JSON.stringify({ manual: data.manual, runtime, aliasInputs }),
  )}`;
  const snapshot: LanguageDatabaseSnapshot = {
    version,
    catalogVersion,
    generated: data.generated,
    manual: data.manual,
    runtime,
  };

  const globals = new Map<string, LanguageMetadataRecord>();
  const methods = new Map<string, LanguageMetadataRecord>();
  const samples = new Map<string, LanguageMetadataRecord>();

  const recordsByLongName = new Map<string, LanguageMetadataRecord>();
  for (const symbol of data.generated.symbols) {
    const record = generatedRecord(symbol, overrideFor(data.manual.entries, symbol.longName));
    recordsByLongName.set(symbol.longName, record);
    if (symbol.scope === 'global' && !globals.has(symbol.name)) {
      globals.set(symbol.name, record);
    }
    if (symbol.memberOf === 'Pattern' && symbol.scope === 'static' && !methods.has(symbol.name)) {
      methods.set(symbol.name, record);
    }
  }

  const addAliases = (
    aliases: ReadonlyMap<string, string>,
    target: Map<string, LanguageMetadataRecord>,
  ): void => {
    for (const [alias, longName] of aliases) {
      const record = recordsByLongName.get(longName);
      if (record === undefined || target.has(alias)) {
        continue;
      }
      target.set(alias, { ...record, name: alias, aliasOf: longName });
    }
  };
  addAliases(
    unambiguousAliases(data.generated.symbols, (symbol) => symbol.scope === 'global'),
    globals,
  );
  addAliases(
    unambiguousAliases(
      data.generated.symbols,
      (symbol) => symbol.memberOf === 'Pattern' && symbol.scope === 'static',
    ),
    methods,
  );

  for (const entry of runtime) {
    const record = runtimeRecord(entry);
    if (entry.kind === 'global') {
      globals.set(entry.name, record);
    } else if (entry.kind === 'method') {
      methods.set(entry.name, record);
    } else {
      samples.set(entry.name, record);
    }
  }

  return { snapshot, globals, methods, samples };
}

export function createLanguageDatabase(options: LanguageDatabaseOptions = {}): LanguageDatabase {
  const inputs = options.versions ?? [
    {
      generated: generatedMetadata,
      manual: manualSemanticSnapshot,
    },
  ];
  if (inputs.length === 0) {
    throw new Error('Language database requires at least one Strudel version');
  }

  const indexes = new Map<string, SnapshotIndex>();
  for (const input of inputs) {
    const index = buildIndex(input);
    if (indexes.has(index.snapshot.version)) {
      throw new Error(`Duplicate Strudel metadata version: ${index.snapshot.version}`);
    }
    indexes.set(index.snapshot.version, index);
  }

  const defaultVersion = options.defaultVersion ?? inputs[0]?.generated.id;
  if (defaultVersion === undefined || !indexes.has(defaultVersion)) {
    throw new Error(`Unknown default Strudel metadata version: ${defaultVersion ?? 'undefined'}`);
  }

  const requireIndex = (version: string | undefined): SnapshotIndex => {
    const resolved = version ?? defaultVersion;
    const index = indexes.get(resolved);
    if (index === undefined) {
      throw new Error(`Unknown Strudel metadata version: ${resolved}`);
    }
    return index;
  };

  return {
    defaultVersion,
    listVersions: () => [...indexes.keys()],
    getSnapshot: (version) => requireIndex(version).snapshot,
    getGlobalRecord: (name, version) => requireIndex(version).globals.get(name),
    getMethodRecord: (name, version) => requireIndex(version).methods.get(name),
    getSampleRecord: (name, version) => requireIndex(version).samples.get(name),
  };
}

export function createDefaultLanguageDatabase(
  options: { readonly runtime?: readonly RuntimeSymbolMetadata[] } = {},
): LanguageDatabase {
  return createLanguageDatabase({
    versions: [
      {
        generated: generatedMetadata,
        manual: manualSemanticSnapshot,
        runtime: options.runtime,
      },
    ],
  });
}
