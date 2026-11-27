import type { SemanticRange } from '../semantic/index.js';
import { positionToOffset } from '../syntax/textCoordinates.js';
import type { SyntaxKind, SyntaxNode, SyntaxPosition, SyntaxRange } from '../syntax/index.js';

import { formatStrudelType } from './metadata.js';
import type {
  FoldingRangeResult,
  FeatureContext,
  InlayHintResult,
  SelectionRangeResult,
} from './types.js';

const FOLDABLE_KINDS: ReadonlySet<SyntaxKind> = new Set<SyntaxKind>([
  'arguments',
  'array',
  'arrowFunction',
  'block',
  'comment',
  'exportDeclaration',
  'formalParameters',
  'functionDeclaration',
  'importDeclaration',
  'namedImports',
  'object',
  'tryStatement',
]);

function foldingKind(kind: SyntaxKind): FoldingRangeResult['kind'] {
  if (kind === 'comment') {
    return 'comment';
  }
  if (kind === 'importDeclaration' || kind === 'namedImports') {
    return 'imports';
  }
  return 'region';
}

/**
 * Uses verified structural nodes to produce deterministic folding boundaries.
 * Incomplete documents produce no ranges so live coding is not disturbed.
 */
export function provideFoldingRanges(context: FeatureContext): readonly FoldingRangeResult[] {
  if (context.syntax.hasErrors) {
    return [];
  }

  const ranges: FoldingRangeResult[] = [];
  const seen = new Set<string>();
  const visit = (node: SyntaxNode): void => {
    const startLine = node.range.start.line;
    const endLine = node.range.end.line;
    if (FOLDABLE_KINDS.has(node.kind) && endLine > startLine) {
      const key = `${startLine}:${endLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        ranges.push({ startLine, endLine, kind: foldingKind(node.kind) });
      }
    }
    for (const child of node.children) {
      visit(child);
    }
  };

  visit(context.syntax.root);
  return ranges.sort(
    (left, right) => left.startLine - right.startLine || left.endLine - right.endLine,
  );
}

function toSemanticRange(range: SyntaxRange): SemanticRange {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
    startOffset: range.startOffset,
    endOffset: range.endOffset,
  };
}

function nodesContainingOffset(root: SyntaxNode, offset: number): SyntaxNode[] {
  const path: SyntaxNode[] = [];
  const visit = (node: SyntaxNode): void => {
    if (offset < node.range.startOffset || offset > node.range.endOffset) {
      return;
    }
    path.push(node);
    for (const child of node.children) {
      visit(child);
    }
  };

  visit(root);
  return path;
}

function selectionRangeForOffset(context: FeatureContext, offset: number): SelectionRangeResult {
  const seen = new Set<string>();
  let parent: SelectionRangeResult | undefined;

  for (const node of nodesContainingOffset(context.syntax.root, offset)) {
    if (node.range.endOffset <= node.range.startOffset) {
      continue;
    }
    if (node.kind === 'token' && node.text.trim() === '') {
      continue;
    }
    const key = `${node.range.startOffset}:${node.range.endOffset}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parent = { range: toSemanticRange(node.range), parent };
  }

  return (
    parent ?? {
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
        startOffset: offset,
        endOffset: offset,
      },
    }
  );
}

/**
 * Builds one leaf-to-root range chain per requested position from the syntax
 * tree. Parser recovery nodes are ignored only when they have no extent, so
 * partially typed input still returns usable structural boundaries.
 */
export function provideSelectionRanges(
  context: FeatureContext,
  positions: readonly SyntaxPosition[],
): readonly SelectionRangeResult[] {
  return positions.map((position) =>
    selectionRangeForOffset(context, positionToOffset(context.text, position)),
  );
}

const INLAY_HINT_SYMBOL_KINDS = new Set(['variable', 'parameter', 'function', 'import']);

/**
 * Emits type hints only for references resolved by the semantic engine. Unknown
 * types, unresolved names, stale token text and malformed documents are skipped.
 */
export function provideInlayHints(context: FeatureContext): readonly InlayHintResult[] {
  if (context.syntax.hasErrors) {
    return [];
  }

  const hints: InlayHintResult[] = [];
  const seen = new Set<string>();
  for (const reference of context.semantic.references) {
    if (reference.kind === 'assignment' || reference.resolvedSymbolId === undefined) {
      continue;
    }
    const symbol = context.semantic.symbols.get(reference.resolvedSymbolId);
    if (
      symbol === undefined ||
      !INLAY_HINT_SYMBOL_KINDS.has(symbol.kind) ||
      symbol.type.kind === 'Unknown'
    ) {
      continue;
    }
    if (
      context.text.slice(reference.range.startOffset, reference.range.endOffset) !== reference.name
    ) {
      continue;
    }

    const key = `${reference.range.end.line}:${reference.range.end.character}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    hints.push({
      position: { line: reference.range.end.line, character: reference.range.end.character },
      label: `: ${formatStrudelType(symbol.type)}`,
      kind: 'type',
      paddingLeft: false,
      paddingRight: true,
    });
  }

  return hints.sort(
    (left, right) =>
      left.position.line - right.position.line ||
      left.position.character - right.position.character,
  );
}
