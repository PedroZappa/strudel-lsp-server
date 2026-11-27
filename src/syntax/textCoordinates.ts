import type { SyntaxPosition, SyntaxRange } from './types.js';

function clampOffset(offset: number, maximum: number): number {
  return Math.max(0, Math.min(offset, maximum));
}

/**
 * The pinned Node binding reports indices and column offsets in UTF-16 code
 * units, matching LSP character offsets. Source positions are derived directly
 * from the document text instead of parser-specific point values.
 */
export function offsetToPosition(text: string, offset: number): SyntaxPosition {
  const target = clampOffset(offset, text.length);
  let line = 0;
  let lineStart = 0;

  for (let index = 0; index < target; index += 1) {
    if (text[index] === '\n') {
      line += 1;
      lineStart = index + 1;
    }
  }

  return { line, character: target - lineStart };
}

export function positionToOffset(text: string, position: SyntaxPosition): number {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      starts.push(index + 1);
    }
  }

  const line = Math.max(0, Math.min(position.line, starts.length - 1));
  const lineStart = starts[line] ?? 0;
  const nextStart = starts[line + 1] ?? text.length + 1;
  let lineEnd = nextStart - 1;
  if (lineEnd > lineStart && text[lineEnd - 1] === '\r') {
    lineEnd -= 1;
  }
  return Math.max(lineStart, Math.min(lineStart + position.character, lineEnd));
}

export function offsetsToRange(text: string, startOffset: number, endOffset: number): SyntaxRange {
  const start = clampOffset(startOffset, text.length);
  const end = clampOffset(endOffset, text.length);

  return {
    start: offsetToPosition(text, start),
    end: offsetToPosition(text, end),
    startOffset: start,
    endOffset: end,
  };
}
