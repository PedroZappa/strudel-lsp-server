import type { MiniNotationAnalysis } from '../miniNotation/index.js';

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
}
