export { provideCompletion } from './completion.js';
export { provideDiagnostics } from './diagnostics.js';
export { provideHover } from './hover.js';
export { provideDefinition, provideReferences } from './navigation.js';
export { provideSignatureHelp } from './signatureHelp.js';
export type {
  CompletionCandidate,
  CompletionCandidateKind,
  DefinitionResult,
  DiagnosticSeverityName,
  FeatureContext,
  HoverResult,
  LanguageDiagnostic,
  ReferenceResult,
  SignatureHelpResult,
  SignatureParameter,
  SymbolLookupResult,
} from './types.js';
