import type { SemanticRange } from '../semantic/index.js';
import { offsetsToRange } from '../syntax/textCoordinates.js';
import type { SyntaxNode } from '../syntax/index.js';

import type { FeatureContext, RefactoringResult, TextEditResult } from './types.js';

const CONSTANT_IDENTIFIERS = new Set(['true', 'false', 'null', 'undefined']);

function rangesOverlap(left: SemanticRange, right: SemanticRange): boolean {
  return left.startOffset <= right.endOffset && right.startOffset <= left.endOffset;
}

function namedChildren(node: SyntaxNode): readonly SyntaxNode[] {
  return node.children.filter((child) => child.named);
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

function containsKind(node: SyntaxNode, kind: SyntaxNode['kind']): boolean {
  if (node.kind === kind) {
    return true;
  }
  return node.children.some((child) => containsKind(child, kind));
}

function isInlineableInitializer(node: SyntaxNode | undefined): node is SyntaxNode {
  if (node === undefined) {
    return false;
  }
  if (node.kind === 'string' || node.kind === 'number') {
    return true;
  }
  if (node.kind === 'templateString') {
    return !containsKind(node, 'templateSubstitution');
  }
  return node.kind === 'identifier' && CONSTANT_IDENTIFIERS.has(node.text);
}

function declarationRemovalRange(text: string, range: SemanticRange): SemanticRange {
  const lineStart = text.lastIndexOf('\n', range.startOffset - 1) + 1;
  if (text.slice(lineStart, range.startOffset).trim() !== '') {
    return range;
  }

  const suffix = text.slice(range.endOffset);
  const newlineLength = suffix.startsWith('\r\n') ? 2 : suffix.startsWith('\n') ? 1 : 0;
  if (newlineLength === 0) {
    return range;
  }

  return offsetsToRange(text, range.startOffset, range.endOffset + newlineLength);
}

/**
 * Returns conservative refactorings for a single-use `const` binding whose
 * initializer is a literal. Only verified semantic references and syntax nodes
 * authorize an edit, and malformed documents never produce a refactoring.
 */
export function provideRefactorings(
  context: FeatureContext,
  range: SemanticRange,
): readonly RefactoringResult[] {
  if (context.syntax.hasErrors) {
    return [];
  }

  const actions: RefactoringResult[] = [];

  for (const symbol of context.semantic.symbols.values()) {
    if (symbol.kind !== 'variable' || symbol.declaration === undefined) {
      continue;
    }

    const references = context.semantic.references.filter(
      (reference) => reference.resolvedSymbolId === symbol.id,
    );
    const reference = references[0];
    if (
      references.length !== 1 ||
      reference?.kind !== 'value' ||
      (!rangesOverlap(symbol.declaration, range) && !rangesOverlap(reference.range, range))
    ) {
      continue;
    }

    if (
      context.text.slice(symbol.declaration.startOffset, symbol.declaration.endOffset) !==
        symbol.name ||
      context.text.slice(reference.range.startOffset, reference.range.endOffset) !== symbol.name
    ) {
      continue;
    }

    const path = nodesContainingOffset(context.syntax.root, symbol.declaration.startOffset);
    const declarationIndex = path.findIndex((node) => node.kind === 'variableDeclaration');
    const declaratorIndex = path.findIndex((node) => node.kind === 'variableDeclarator');
    const declaration = path[declarationIndex];
    const declarator = path[declaratorIndex];
    if (
      declarationIndex < 0 ||
      declaratorIndex < 0 ||
      declarationIndex > declaratorIndex ||
      declaration === undefined ||
      declarator === undefined ||
      path[declarationIndex - 1]?.kind === 'exportDeclaration' ||
      !/^const\s/.test(declaration.text)
    ) {
      continue;
    }

    const declarators = namedChildren(declaration).filter(
      (node) => node.kind === 'variableDeclarator',
    );
    const initializer = namedChildren(declarator).find((node) => node.kind !== 'identifier');
    if (declarators.length !== 1 || !isInlineableInitializer(initializer)) {
      continue;
    }

    const edits: TextEditResult[] = [
      {
        range: declarationRemovalRange(
          context.text,
          offsetsToRange(context.text, declaration.range.startOffset, declaration.range.endOffset),
        ),
        newText: '',
      },
      { range: reference.range, newText: initializer.text },
    ];

    actions.push({
      title: `Inline constant '${symbol.name}'`,
      kind: 'refactor.inline',
      diagnostics: [],
      edits,
    });
  }

  return actions;
}
