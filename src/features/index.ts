export { provideCompletion } from './completion.js';
export { provideDiagnostics } from './diagnostics.js';
export { provideHover } from './hover.js';
export { provideDefinition, provideReferences } from './navigation.js';
export type {
  CompletionCandidate,
  CompletionCandidateKind,
  DefinitionResult,
  DiagnosticSeverityName,
  FeatureContext,
  HoverResult,
  LanguageDiagnostic,
  ReferenceResult,
  SymbolLookupResult,
} from './types.js';
