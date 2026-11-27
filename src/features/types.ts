import type { LanguageDatabase } from '../languageDatabase/index.js';
import type { SemanticDocument, SemanticRange, SemanticSymbol } from '../semantic/index.js';
import type { SyntaxDocument, SyntaxNode, SyntaxPosition } from '../syntax/index.js';

export type DiagnosticSeverityName = 'error' | 'warning' | 'information' | 'hint';

export type CompletionCandidateKind =
  'function' | 'method' | 'variable' | 'class' | 'value' | 'file';

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

export type CodeActionKindName = 'quickfix' | 'refactor.inline' | 'refactor.extract';

export interface QuickFixResult {
  readonly title: string;
  readonly kind: 'quickfix';
  readonly diagnostics: readonly LanguageDiagnostic[];
  readonly edits: readonly TextEditResult[];
}

export interface RefactoringResult {
  readonly title: string;
  readonly kind: 'refactor.inline' | 'refactor.extract';
  readonly diagnostics: readonly LanguageDiagnostic[];
  readonly edits: readonly TextEditResult[];
}

export type CodeActionResult = QuickFixResult | RefactoringResult;

export interface CompletionRequestOptions {
  /** Transport-supplied file URIs from the bounded on-demand workspace scan. */
  readonly workspaceFileUris?: readonly string[];
}

export interface CompletionCandidate {
  readonly label: string;
  readonly kind: CompletionCandidateKind;
  readonly detail?: string;
  readonly documentation?: string;
  /** Set only when pinned metadata marks the item deprecated. */
  readonly deprecated?: true;
  /** Opaque, versioned token used only by `completionItem/resolve`. */
  readonly data?: CompletionResolveData;
  readonly replacementRange: SemanticRange;
}

export interface CompletionResolveData {
  readonly metadataVersion: string;
  readonly recordKind: 'global' | 'method';
  readonly name: string;
}

export interface CompletionResolveInput {
  readonly label: string;
  readonly data?: unknown;
}

export interface CompletionResolveResult {
  readonly detail?: string;
  readonly documentation?: string;
  readonly deprecated?: true;
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

export interface WorkspaceLocationResult {
  readonly uri: string;
  readonly range: SemanticRange;
}

export interface SignatureParameter {
  readonly label: string;
  /** UTF-16 offsets into the signature label, as required by LSP. */
  readonly labelRange: readonly [number, number];
  readonly documentation?: string;
  readonly optional?: boolean;
  readonly rest?: boolean;
}

export interface SignatureHelpSignature {
  readonly label: string;
  readonly documentation?: string;
  readonly parameters: readonly SignatureParameter[];
}

export interface SignatureHelpResult {
  readonly signatures: readonly SignatureHelpSignature[];
  readonly activeSignature: number;
  readonly activeParameter: number;
  readonly range: SemanticRange;
}

export interface SymbolLookupResult {
  readonly symbol: SemanticSymbol;
  readonly range: SemanticRange;
}

export interface PrepareRenameResult {
  readonly range: SemanticRange;
  readonly placeholder: string;
}

export interface RenameResult {
  readonly edits: readonly TextEditResult[];
}

export type DocumentSymbolKind = 'variable' | 'function' | 'parameter' | 'import';

export interface DocumentSymbolResult {
  readonly name: string;
  readonly kind: DocumentSymbolKind;
  /** Stable within a semantic snapshot; used by resolve tokens and call hierarchy. */
  readonly symbolId?: string;
  readonly detail?: string;
  /** Full extent of the declaration, including an owned function body. */
  readonly range: SemanticRange;
  /** Exact name token used as the outline selection. */
  readonly selectionRange: SemanticRange;
  readonly children: readonly DocumentSymbolResult[];
}

export interface WorkspaceSymbolResult {
  readonly name: string;
  readonly kind: DocumentSymbolKind;
  readonly uri: string;
  /** Exact name token used to reveal the symbol in the editor. */
  readonly range: SemanticRange;
  readonly containerName?: string;
  /** Opaque, versioned token used only by `workspaceSymbol/resolve`. */
  readonly data?: WorkspaceSymbolResolveData;
}

export interface WorkspaceSymbolResolveData {
  readonly metadataVersion: string;
  readonly name: string;
  readonly kind: DocumentSymbolKind;
  /** Exact reveal range withheld from clients that support lazy range resolution. */
  readonly range: SemanticRange;
}

export interface WorkspaceSymbolResolveInput {
  readonly name: string;
  readonly data?: unknown;
}

export interface WorkspaceSymbolResolveResult {
  readonly range?: SemanticRange;
}

export interface FoldingRangeResult {
  readonly startLine: number;
  readonly endLine: number;
  readonly kind?: 'comment' | 'imports' | 'region';
}

export interface SelectionRangeResult {
  readonly range: SemanticRange;
  readonly parent?: SelectionRangeResult;
}

export type InlayHintKindName = 'type';

export interface InlayHintResult {
  readonly position: SyntaxPosition;
  readonly label: string;
  readonly kind: InlayHintKindName;
  readonly paddingLeft?: boolean;
  readonly paddingRight?: boolean;
}

export interface CallHierarchyItemResult {
  readonly uri: string;
  readonly name: string;
  readonly kind: 'function';
  readonly range: SemanticRange;
  readonly selectionRange: SemanticRange;
  readonly data: CallHierarchyData;
}

export interface CallHierarchyData {
  readonly version: number;
  readonly uri: string;
  readonly symbolId: string;
  readonly name: string;
}

export interface CallHierarchyCallResult {
  readonly from: CallHierarchyItemResult;
  readonly fromRanges: readonly SemanticRange[];
}

export type SemanticTokenType =
  'function' | 'method' | 'variable' | 'parameter' | 'number' | 'operator';

export type SemanticTokenModifier = 'declaration' | 'defaultLibrary';

export interface SemanticTokenResult {
  readonly range: SemanticRange;
  readonly type: SemanticTokenType;
  readonly modifiers: readonly SemanticTokenModifier[];
}

export interface FormattingOptions {
  readonly tabSize: number;
  readonly insertSpaces: boolean;
}

export interface FormattingResult {
  readonly edits: readonly TextEditResult[];
}
