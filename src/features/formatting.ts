import type { SyntaxKind, SyntaxNode } from '../syntax/index.js';

import type {
  FeatureContext,
  FormattingOptions,
  FormattingResult,
  TextEditResult,
} from './types.js';

const STATEMENT_KINDS: ReadonlySet<SyntaxKind> = new Set<SyntaxKind>([
  'expressionStatement',
  'variableDeclaration',
  'functionDeclaration',
  'returnStatement',
  'importDeclaration',
  'exportDeclaration',
  'labeledStatement',
  'tryStatement',
]);

const PROTECTED_KINDS: ReadonlySet<SyntaxKind> = new Set<SyntaxKind>([
  'string',
  'templateString',
  'comment',
]);

interface IndentCandidate {
  readonly depth: number;
  readonly character: number;
}

function countBlocks(nodes: readonly SyntaxNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.kind === 'block') {
      count += 1;
    }
  }
  return count;
}

function collectCandidates(root: SyntaxNode): Map<number, IndentCandidate[]> {
  const byLine = new Map<number, IndentCandidate[]>();
  const visit = (node: SyntaxNode, ancestors: readonly SyntaxNode[]): void => {
    const parent = ancestors[ancestors.length - 1];
    let depth: number | undefined;

    if (STATEMENT_KINDS.has(node.kind)) {
      depth = countBlocks(ancestors);
    } else if (
      node.kind === 'comment' &&
      (parent?.kind === 'sourceFile' || parent?.kind === 'block')
    ) {
      depth = countBlocks(ancestors);
    } else if (
      node.kind === 'token' &&
      parent?.kind === 'block' &&
      (node.text === '{' || node.text === '}')
    ) {
      // The brace itself belongs to this block; its indentation is determined
      // by the blocks that contain it.
      depth = countBlocks(ancestors.slice(0, -1));
    }

    if (depth !== undefined) {
      const line = node.range.start.line;
      const candidates = byLine.get(line) ?? [];
      candidates.push({ depth, character: node.range.start.character });
      byLine.set(line, candidates);
    }

    for (const child of node.children) {
      visit(child, [...ancestors, node]);
    }
  };

  visit(root, []);
  return byLine;
}

function collectProtectedNodes(root: SyntaxNode): SyntaxNode[] {
  const nodes: SyntaxNode[] = [];
  const visit = (node: SyntaxNode): void => {
    if (PROTECTED_KINDS.has(node.kind)) {
      nodes.push(node);
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
  return nodes;
}

function lineStartOffsets(text: string): number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

function normalizeOptions(options: FormattingOptions): FormattingOptions {
  const tabSize =
    Number.isInteger(options.tabSize) && options.tabSize >= 1 && options.tabSize <= 8
      ? options.tabSize
      : 2;
  return { tabSize, insertSpaces: options.insertSpaces !== false };
}

/**
 * Only leading indentation of syntax-verified statements and block braces is
 * rewritten. Code text, line breaks, trailing whitespace and the contents of
 * strings, templates and comments are never touched. Documents with syntax
 * errors are left alone so live coding is not disrupted by partial input.
 */
export function provideFormatting(
  context: FeatureContext,
  options: FormattingOptions,
): FormattingResult {
  if (context.syntax.hasErrors) {
    return { edits: [] };
  }

  const { insertSpaces, tabSize } = normalizeOptions(options);
  const unit = insertSpaces ? ' '.repeat(tabSize) : '\t';
  const starts = lineStartOffsets(context.text);
  const candidates = collectCandidates(context.syntax.root);
  const protectedNodes = collectProtectedNodes(context.syntax.root);
  const edits: TextEditResult[] = [];

  for (const [line, lineCandidates] of candidates) {
    const lineStart = starts[line];
    if (lineStart === undefined) {
      continue;
    }
    const lineEnd =
      starts[line + 1] === undefined ? context.text.length : (starts[line + 1] ?? 0) - 1;

    if (
      protectedNodes.some(
        (node) => node.range.startOffset < lineStart && lineStart < node.range.endOffset,
      )
    ) {
      continue;
    }

    let index = lineStart;
    while (index < lineEnd && (context.text[index] === ' ' || context.text[index] === '\t')) {
      index += 1;
    }
    if (index === lineEnd) {
      continue;
    }

    const character = index - lineStart;
    const depths = new Set(
      lineCandidates
        .filter((candidate) => candidate.character === character)
        .map((candidate) => candidate.depth),
    );
    if (depths.size !== 1) {
      continue;
    }

    const desired = unit.repeat(depths.values().next().value ?? 0);
    const current = context.text.slice(lineStart, index);
    if (current === desired) {
      continue;
    }

    edits.push({
      range: {
        start: { line, character: 0 },
        end: { line, character },
        startOffset: lineStart,
        endOffset: index,
      },
      newText: desired,
    });
  }

  return { edits: edits.sort((left, right) => left.range.startOffset - right.range.startOffset) };
}
