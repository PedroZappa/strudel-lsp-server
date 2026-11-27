import type { MiniNotationAnalysis } from '../miniNotation/index.js';
import type { LocalTimingRecorder } from '../performance/index.js';

/** Parser-independent source range used by the semantic model. */
export interface SemanticRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
  startOffset: number;
  endOffset: number;
}

export type StrudelTypeKind =
  | 'Pattern'
  | 'PatternMethod'
  | 'MiniNotationPattern'
  | 'Function'
  | 'Number'
  | 'String'
  | 'Boolean'
  | 'Array'
  | 'Object'
  | 'SampleName'
  | 'Unknown';

export interface StrudelType {
  readonly kind: StrudelTypeKind;
  readonly returnType?: StrudelType;
  /** Additive callable detail used by signature help for user functions. */
  readonly signature?: SemanticSignature;
}

export interface SemanticSignatureParameter {
  /** Parameter label, including `?` or `...` markers where supported. */
  readonly label: string;
  readonly documentation?: string;
  readonly optional?: boolean;
  readonly rest?: boolean;
}

export interface SemanticSignature {
  readonly label: string;
  readonly documentation?: string;
  readonly parameters: readonly SemanticSignatureParameter[];
  readonly source: 'catalog' | 'user';
}

export type SemanticSymbolKind =
  'variable' | 'function' | 'parameter' | 'import' | 'builtin' | 'method' | 'sample';

export interface SemanticSymbol {
  readonly id: string;
  readonly name: string;
  readonly kind: SemanticSymbolKind;
  readonly type: StrudelType;
  readonly declaration?: SemanticRange;
  readonly scopeId: string;
  readonly signature?: SemanticSignature;
}

export type SemanticScopeKind = 'global' | 'function' | 'block';

export interface SemanticScope {
  readonly id: string;
  readonly kind: SemanticScopeKind;
  readonly range: SemanticRange;
  readonly parentId?: string;
  readonly symbolIds: readonly string[];
  readonly childIds: readonly string[];
}

export type SemanticReferenceKind = 'value' | 'call' | 'method' | 'assignment';

export interface SemanticReference {
  readonly id: string;
  readonly name: string;
  readonly kind: SemanticReferenceKind;
  readonly range: SemanticRange;
  readonly scopeId: string;
  readonly resolvedSymbolId?: string;
}

export interface MiniNotationArgument {
  readonly range: SemanticRange;
  readonly ownerName: string;
  readonly inferredType: StrudelType;
  readonly analysis?: MiniNotationAnalysis;
}

export interface SemanticDocument {
  readonly uri: string;
  readonly version: number;
  readonly rootScopeId: string;
  readonly scopes: ReadonlyMap<string, SemanticScope>;
  readonly symbols: ReadonlyMap<string, SemanticSymbol>;
  readonly references: readonly SemanticReference[];
  readonly miniNotationArguments: readonly MiniNotationArgument[];
}

export interface SemanticCancellationToken {
  readonly isCancellationRequested: boolean;
}

export interface SemanticAnalysisOptions {
  readonly previous?: SemanticDocument;
  readonly token?: SemanticCancellationToken;
  /** Optional in-process diagnosis hook; the server never supplies one by default. */
  readonly timing?: LocalTimingRecorder;
}
