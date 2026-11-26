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
