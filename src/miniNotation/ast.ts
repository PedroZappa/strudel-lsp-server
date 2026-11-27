import type { SemanticRange } from '../semantic/index.js';
import { offsetsToRange } from '../syntax/textCoordinates.js';

import type {
  MiniNotationIssue,
  MiniNotationIssueCode,
  MiniNotationToken,
  MiniNotationTokenKind,
} from './types.js';

export type MiniNotationAstNodeKind =
  | 'sequence'
  | 'subsequence'
  | 'alternation'
  | 'polymeter'
  | 'euclid'
  | 'step'
  | 'rest'
  | 'number'
  | 'operator'
  | 'unknown'
  | 'error';

export interface MiniNotationAstNode {
  readonly kind: MiniNotationAstNodeKind;
  readonly text: string;
  readonly range: SemanticRange;
  readonly description: string;
  readonly children: readonly MiniNotationAstNode[];
  /** Set for operator nodes to retain the pinned lexical token category. */
  readonly operator?: MiniNotationTokenKind;
  /** Range of the preceding meaningful node in the same group, when one exists. */
  readonly targetRange?: SemanticRange;
  /** Stable diagnostic code associated with a recovered node, when applicable. */
  readonly issueCode?: MiniNotationIssueCode;
  readonly expectedClose?: string;
  readonly incomplete?: boolean;
  readonly empty?: boolean;
}

export interface MiniNotationAst {
  readonly root: MiniNotationAstNode;
}

interface WritableNode {
  kind: MiniNotationAstNodeKind;
  text: string;
  range: SemanticRange;
  description: string;
  children: WritableNode[];
  operator?: MiniNotationTokenKind;
  targetRange?: SemanticRange;
  issueCode?: MiniNotationIssueCode;
  expectedClose?: string;
  incomplete?: boolean;
  empty?: boolean;
}

interface Frame {
  readonly node: WritableNode;
  readonly closer: string;
  readonly startOffset: number;
  readonly emptyRange?: SemanticRange;
}

const GROUP_KINDS: Readonly<Record<string, MiniNotationAstNodeKind>> = {
  '[': 'subsequence',
  '<': 'alternation',
  '{': 'polymeter',
  '(': 'euclid',
};

const OPENERS: Readonly<Record<string, string>> = {
  '[': ']',
  '<': '>',
  '{': '}',
  '(': ')',
};

const CLOSERS: ReadonlySet<string> = new Set([']', '>', '}', ')']);

const OPERANDED_OPERATORS: ReadonlySet<MiniNotationTokenKind> = new Set<MiniNotationTokenKind>([
  'repeat',
  'slow',
  'weight',
  'replicate',
  'degrade',
  'slice',
  'range',
]);

function sameRange(left: SemanticRange, right: SemanticRange): boolean {
  return left.startOffset === right.startOffset && left.endOffset === right.endOffset;
}

function nodeKindForToken(token: MiniNotationToken): MiniNotationAstNodeKind {
  switch (token.kind) {
    case 'step':
      return 'step';
    case 'rest':
      return 'rest';
    case 'number':
      return 'number';
    case 'unknown':
      return 'unknown';
    case 'subsequence':
    case 'alternation':
    case 'polymeter':
    case 'euclid':
      return token.kind;
    default:
      return 'operator';
  }
}

function freeze(node: WritableNode): MiniNotationAstNode {
  return {
    kind: node.kind,
    text: node.text,
    range: node.range,
    description: node.description,
    children: node.children.map(freeze),
    operator: node.operator,
    targetRange: node.targetRange,
    issueCode: node.issueCode,
    expectedClose: node.expectedClose,
    incomplete: node.incomplete,
    empty: node.empty,
  };
}

/**
 * Builds a conservative Strudel-owned structure over the pinned lexical tokens.
 * It models syntax shape and recovery, not pattern evaluation: note pitches,
 * sample identity and randomness outcomes remain outside this layer. Every node
 * range is an absolute document range so semantic reuse can shift it safely.
 */
export function buildMiniNotationAst(
  documentText: string,
  startOffset: number,
  endOffset: number,
  tokens: readonly MiniNotationToken[],
  issues: readonly MiniNotationIssue[],
): MiniNotationAst {
  const root: WritableNode = {
    kind: 'sequence',
    text: documentText.slice(startOffset, endOffset),
    range: offsetsToRange(documentText, startOffset, endOffset),
    description: 'Strudel mini-notation sequence.',
    children: [],
  };
  const stack: Frame[] = [];
  let lastCreatedNode: WritableNode | undefined;

  const issueForToken = (
    token: MiniNotationToken,
    codes: readonly MiniNotationIssueCode[],
  ): MiniNotationIssue | undefined =>
    issues.find((issue) => sameRange(issue.range, token.range) && codes.includes(issue.code));

  for (const token of tokens) {
    if (token.kind === 'whitespace') {
      continue;
    }
    const parent = stack[stack.length - 1]?.node ?? root;
    const targetRange = parent.children[parent.children.length - 1]?.range;
    const openerKind = GROUP_KINDS[token.text];
    const expectedClose = OPENERS[token.text];

    if (openerKind !== undefined && expectedClose !== undefined) {
      const emptyRange = issues.find(
        (issue) =>
          issue.code === 'empty-group' &&
          issue.range.startOffset === token.range.startOffset &&
          issue.range.endOffset > token.range.endOffset,
      )?.range;
      const node: WritableNode = {
        kind: openerKind,
        text: documentText.slice(token.range.startOffset, token.range.endOffset),
        range: token.range,
        description: token.description,
        children: [],
      };
      parent.children.push(node);
      stack.push({
        node,
        closer: expectedClose,
        startOffset: token.range.startOffset,
        emptyRange,
      });
      lastCreatedNode = node;
      continue;
    }

    if (CLOSERS.has(token.text)) {
      const recoveryIssue =
        issueForToken(token, ['unmatched-close']) ?? issueForToken(token, ['mismatched-close']);
      const frame = stack[stack.length - 1];
      if (recoveryIssue === undefined && frame?.closer === token.text) {
        frame.node.range = offsetsToRange(documentText, frame.startOffset, token.range.endOffset);
        frame.node.text = documentText.slice(frame.startOffset, token.range.endOffset);
        if (frame.emptyRange !== undefined && sameRange(frame.emptyRange, frame.node.range)) {
          frame.node.empty = true;
        }
        stack.pop();
        lastCreatedNode = frame.node;
        continue;
      }

      const errorNode: WritableNode = {
        kind: 'error',
        text: documentText.slice(token.range.startOffset, token.range.endOffset),
        range: token.range,
        description: recoveryIssue?.message ?? `Unexpected '${token.text}' in mini notation`,
        children: [],
        issueCode: recoveryIssue?.code ?? 'unmatched-close',
        expectedClose: recoveryIssue?.expectedClose,
      };
      parent.children.push(errorNode);
      lastCreatedNode = errorNode;
      continue;
    }

    const kind = nodeKindForToken(token);
    const node: WritableNode = {
      kind,
      text: documentText.slice(token.range.startOffset, token.range.endOffset),
      range: token.range,
      description: token.description,
      children: [],
    };
    if (kind === 'operator') {
      node.operator = token.kind;
      if (OPERANDED_OPERATORS.has(token.kind) && targetRange !== undefined) {
        node.targetRange = targetRange;
      }
    }
    const separatorIssue = issueForToken(token, ['empty-step']);
    if (separatorIssue !== undefined) {
      node.issueCode = separatorIssue.code;
    }
    parent.children.push(node);
    lastCreatedNode = node;
  }

  for (const frame of stack) {
    frame.node.range = offsetsToRange(documentText, frame.startOffset, endOffset);
    frame.node.text = documentText.slice(frame.startOffset, endOffset);
    frame.node.incomplete = true;
  }
  if (
    lastCreatedNode?.kind === 'operator' &&
    lastCreatedNode.operator !== undefined &&
    (OPERANDED_OPERATORS.has(lastCreatedNode.operator) ||
      lastCreatedNode.operator === 'parallel' ||
      lastCreatedNode.operator === 'choice')
  ) {
    lastCreatedNode.incomplete = true;
  }

  return { root: freeze(root) };
}

/** Returns AST nodes in document order, including the root and nested groups. */
export function miniNotationAstNodes(root: MiniNotationAstNode): readonly MiniNotationAstNode[] {
  const nodes: MiniNotationAstNode[] = [];
  const visit = (node: MiniNotationAstNode): void => {
    nodes.push(node);
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
  return nodes;
}
