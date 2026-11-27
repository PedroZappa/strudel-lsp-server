import type { LanguageDatabase } from '../languageDatabase/index.js';
import type { SemanticDocument, SemanticRange, SemanticSymbol } from '../semantic/index.js';
import type { SyntaxDocument, SyntaxNode } from '../syntax/index.js';

export type DiagnosticSeverityName = 'error' | 'warning' | 'information';

export type CompletionCandidateKind = 'function' | 'method' | 'variable' | 'class' | 'value';

export interface FeatureContext {
  readonly uri: string;
  readonly text: string;
  readonly syntax: SyntaxDocument;
  readonly semantic: SemanticDocument;
  readonly database: LanguageDatabase;
  readonly node?: SyntaxNode;
}

export interface DiagnosticFix {
  readonly title: string;
  readonly range: SemanticRange;
  readonly newText: string;
}

export interface LanguageDiagnostic {
  readonly range: SemanticRange;
  readonly severity: DiagnosticSeverityName;
  readonly message: string;
  readonly source: string;
  readonly code?: string;
  readonly fix?: DiagnosticFix;
}

export interface TextEditResult {
  readonly range: SemanticRange;
  readonly newText: string;
}

export interface QuickFixResult {
  readonly title: string;
  readonly diagnostics: readonly LanguageDiagnostic[];
  readonly edits: readonly TextEditResult[];
}

export interface CompletionCandidate {
  readonly label: string;
  readonly kind: CompletionCandidateKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly replacementRange: SemanticRange;
}

export interface HoverResult {
  readonly range: SemanticRange;
  readonly contents: string;
}

export interface DefinitionResult {
  readonly range: SemanticRange;
}

export interface ReferenceResult {
  readonly range: SemanticRange;
}

export interface SignatureParameter {
  readonly label: string;
  /** UTF-16 offsets into the signature label, as required by LSP. */
  readonly labelRange: readonly [number, number];
  readonly documentation?: string;
}

export interface SignatureHelpResult {
  readonly label: string;
  readonly documentation?: string;
  readonly parameters: readonly SignatureParameter[];
  readonly activeParameter: number;
  readonly range: SemanticRange;
}

export interface SymbolLookupResult {
  readonly symbol: SemanticSymbol;
  readonly range: SemanticRange;
}
