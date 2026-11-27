export {
  createEmptySemanticCatalog,
  createStaticSemanticCatalog,
  type SemanticCatalog,
  type SemanticCatalogEntry,
  type SemanticCatalogEntryKind,
  type StaticSemanticCatalogOptions,
} from './catalog.js';
export { SemanticAnalysisCancelledError, throwIfCancelled } from './cancellation.js';
export {
  ARRAY_TYPE,
  BOOLEAN_TYPE,
  functionType,
  MINI_NOTATION_PATTERN_TYPE,
  NUMBER_TYPE,
  OBJECT_TYPE,
  patternMethodType,
  PATTERN_METHOD_TYPE,
  PATTERN_TYPE,
  STRING_TYPE,
  strudelType,
  UNKNOWN_TYPE,
} from './factories.js';
export { createSemanticEngine, SemanticEngine } from './analyzer.js';
export {
  findReferenceAt,
  findScopeAt,
  findSymbolAt,
  resolveReference,
  typeOfReference,
} from './queries.js';
export type {
  MiniNotationArgument,
  SemanticAnalysisOptions,
  SemanticCancellationToken,
  SemanticDocument,
  SemanticRange,
  SemanticReference,
  SemanticReferenceKind,
  SemanticScope,
  SemanticScopeKind,
  SemanticSignature,
  SemanticSignatureParameter,
  SemanticSymbol,
  SemanticSymbolKind,
  StrudelType,
  StrudelTypeKind,
} from './types.js';
