import type { SyntaxDocument, SyntaxKind, SyntaxNode } from '../../src/syntax/index.js';
import type { SemanticRange } from '../../src/semantic/index.js';

export interface FixtureNodeSpec {
  readonly kind: SyntaxKind;
  readonly text: string;
  readonly occurrence?: number;
  readonly children?: readonly FixtureNodeSpec[];
  readonly isError?: boolean;
  readonly isMissing?: boolean;
}

function findOccurrence(text: string, needle: string, occurrence: number): number {
  let from = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    const found = text.indexOf(needle, from);
    if (found < 0) {
      throw new Error(`Fixture text not found: ${needle}`);
    }
    if (index === occurrence) {
      return found;
    }
    from = found + 1;
  }
  throw new Error(`Fixture occurrence not found: ${needle}`);
}

function rangeFor(text: string, startOffset: number, endOffset: number): SemanticRange {
  const toPosition = (offset: number): { line: number; character: number } => {
    let line = 0;
    let lineStart = 0;
    for (let index = 0; index < offset; index += 1) {
      if (text[index] === '\n') {
        line += 1;
        lineStart = index + 1;
      }
    }
    return { line, character: offset - lineStart };
  };

  return {
    start: toPosition(startOffset),
    end: toPosition(endOffset),
    startOffset,
    endOffset,
  };
}

export function createFixtureDocument(
  text: string,
  children: readonly FixtureNodeSpec[] = [],
  version = 1,
): { readonly document: SyntaxDocument; readonly nodes: readonly SyntaxNode[] } {
  let nextId = 1;
  const builtNodes: SyntaxNode[] = [];

  const build = (spec: FixtureNodeSpec): SyntaxNode => {
    const startOffset = findOccurrence(text, spec.text, spec.occurrence ?? 0);
    const endOffset = startOffset + spec.text.length;
    const childrenNodes = (spec.children ?? []).map(build);
    const isError = spec.isError ?? false;
    const node: SyntaxNode = {
      id: nextId,
      kind: spec.kind,
      named: spec.kind !== 'token',
      hasError: isError || childrenNodes.some((child) => child.hasError),
      isError,
      isMissing: spec.isMissing ?? false,
      text: spec.text,
      range: rangeFor(text, startOffset, endOffset),
      children: childrenNodes,
    };
    nextId += 1;
    builtNodes.push(node);
    return node;
  };

  const root: SyntaxNode = {
    id: 0,
    kind: 'sourceFile',
    named: true,
    hasError: children.some((child) => child.isError === true),
    isError: false,
    isMissing: false,
    text,
    range: rangeFor(text, 0, text.length),
    children: children.map(build),
  };

  return {
    document: {
      uri: 'file:///fixture.strdl',
      version,
      text,
      hasErrors: root.hasError,
      root,
    },
    nodes: builtNodes,
  };
}
