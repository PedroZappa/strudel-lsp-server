import type { SemanticRange } from '../semantic/index.js';

export type MiniNotationTokenKind =
  | 'step'
  | 'rest'
  | 'number'
  | 'repeat'
  | 'slow'
  | 'weight'
  | 'replicate'
  | 'degrade'
  | 'parallel'
  | 'choice'
  | 'slice'
  | 'range'
  | 'feet'
  | 'subsequence'
  | 'alternation'
  | 'polymeter'
  | 'euclid'
  | 'stepMarker'
  | 'whitespace'
  | 'unknown';

export interface MiniNotationToken {
  readonly kind: MiniNotationTokenKind;
  readonly text: string;
  readonly range: SemanticRange;
  readonly description: string;
}

export type MiniNotationIssueCode =
  'unmatched-close' | 'mismatched-close' | 'empty-group' | 'empty-step';

export interface MiniNotationIssue {
  readonly code: MiniNotationIssueCode;
  readonly message: string;
  readonly range: SemanticRange;
}

export interface MiniNotationAnalysis {
  readonly tokens: readonly MiniNotationToken[];
  readonly issues: readonly MiniNotationIssue[];
}
