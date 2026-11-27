import type { SemanticSignature, StrudelTypeKind } from '../semantic/index.js';

export type MetadataOrigin = 'generated' | 'manual' | 'runtime';

export type MetadataRecordKind = 'function' | 'member' | 'constant' | 'class' | 'package' | 'value';

export type MetadataScope = 'global' | 'static' | 'instance' | 'inner' | 'unknown';

export interface MetadataSource {
  readonly packageName: string;
  readonly version: string;
  readonly tarball: string;
  readonly integrity: string;
  readonly license: string;
  readonly repository: string;
  readonly role: 'record-source' | 'integrity-input';
}

export interface MetadataParameter {
  readonly name?: string;
  readonly types: readonly string[];
  readonly description?: string;
}

export interface MetadataReturn {
  readonly types: readonly string[];
  readonly description?: string;
}

export interface GeneratedSymbolMetadata {
  readonly name: string;
  readonly longName: string;
  readonly kind: MetadataRecordKind;
  readonly scope: MetadataScope;
  readonly memberOf?: string;
  readonly returnType: StrudelTypeKind;
  readonly description?: string;
  readonly examples: readonly string[];
  readonly parameters: readonly MetadataParameter[];
  readonly returns: readonly MetadataReturn[];
  readonly synonyms: readonly string[];
  readonly deprecated?: boolean;
  readonly sourceFile?: string;
  readonly sourceLine?: number;
}

export interface GeneratedMetadataSnapshot {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly strudelVersion: string;
  readonly sources: readonly MetadataSource[];
  readonly symbols: readonly GeneratedSymbolMetadata[];
}

export interface ManualSemanticEntry {
  readonly longName: string;
  readonly returnType: StrudelTypeKind;
  readonly miniNotationArguments?: readonly number[];
  readonly signatures?: readonly SemanticSignature[];
  readonly evidence: readonly string[];
}

export interface ManualSemanticSnapshot {
  readonly schemaVersion: 1;
  readonly entries: readonly ManualSemanticEntry[];
}

export interface RuntimeSymbolMetadata {
  readonly name: string;
  readonly kind: 'global' | 'method' | 'sample';
  readonly returnType: StrudelTypeKind;
  readonly miniNotationArguments?: readonly number[];
  readonly description?: string;
}

export interface LanguageMetadataRecord {
  readonly name: string;
  readonly longName: string;
  readonly origin: MetadataOrigin;
  readonly kind: MetadataRecordKind;
  readonly scope: MetadataScope;
  readonly memberOf?: string;
  readonly returnType: StrudelTypeKind;
  readonly miniNotationArguments?: readonly number[];
  readonly description?: string;
  readonly aliasOf?: string;
  /** True only when the pinned generated snapshot marks the symbol deprecated. */
  readonly deprecated?: true;
  readonly signatures?: readonly SemanticSignature[];
  readonly examples: readonly string[];
  readonly parameters: readonly MetadataParameter[];
  readonly returns: readonly MetadataReturn[];
  readonly sourceFile?: string;
  readonly sourceLine?: number;
}

export interface LanguageVersionData {
  readonly generated: GeneratedMetadataSnapshot;
  readonly manual: ManualSemanticSnapshot;
  readonly runtime?: readonly RuntimeSymbolMetadata[];
}

export interface LanguageDatabaseSnapshot extends LanguageVersionData {
  readonly version: string;
  readonly catalogVersion: string;
  readonly runtime: readonly RuntimeSymbolMetadata[];
}

export interface LanguageDatabaseOptions {
  readonly versions?: readonly LanguageVersionData[];
  readonly defaultVersion?: string;
}

export interface LanguageDatabase {
  readonly defaultVersion: string;
  listVersions(): readonly string[];
  getSnapshot(version?: string): LanguageDatabaseSnapshot;
  getGlobalRecord(name: string, version?: string): LanguageMetadataRecord | undefined;
  getMethodRecord(name: string, version?: string): LanguageMetadataRecord | undefined;
  getSampleRecord(name: string, version?: string): LanguageMetadataRecord | undefined;
}
