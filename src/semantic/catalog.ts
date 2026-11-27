import type { StrudelType } from './types.js';

export type SemanticCatalogEntryKind = 'function' | 'method' | 'value' | 'sample';

export interface SemanticCatalogEntry {
  readonly kind: SemanticCatalogEntryKind;
  readonly type: StrudelType;
  /** Zero-based argument positions where mini-notation strings are expected. */
  readonly miniNotationArguments?: readonly number[];
}

/**
 * Metadata boundary for Phase 4. The generated language database from Phase 5
 * can implement this interface without the semantic engine depending on it.
 */
export interface SemanticCatalog {
  readonly version: string;
  getGlobal(name: string): SemanticCatalogEntry | undefined;
  getMethod(name: string, receiverType: StrudelType): SemanticCatalogEntry | undefined;
  getSample(name: string): SemanticCatalogEntry | undefined;
}

export interface StaticSemanticCatalogOptions {
  readonly version?: string;
  readonly globals?: Readonly<Record<string, SemanticCatalogEntry>>;
  readonly methods?: Readonly<Record<string, SemanticCatalogEntry>>;
  readonly samples?: Readonly<Record<string, SemanticCatalogEntry>>;
}

export function createStaticSemanticCatalog(
  options: StaticSemanticCatalogOptions = {},
): SemanticCatalog {
  const globals = options.globals ?? {};
  const methods = options.methods ?? {};
  const samples = options.samples ?? {};

  return {
    version: options.version ?? 'static',
    getGlobal: (name) => globals[name],
    getMethod: (name) => methods[name],
    getSample: (name) => samples[name],
  };
}

export function createEmptySemanticCatalog(): SemanticCatalog {
  return createStaticSemanticCatalog({ version: 'empty' });
}
