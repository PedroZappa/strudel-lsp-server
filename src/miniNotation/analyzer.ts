import { offsetsToRange } from '../syntax/textCoordinates.js';

import { TOKEN_DESCRIPTIONS } from './documentation.js';
import type {
  MiniNotationAnalysis,
  MiniNotationIssue,
  MiniNotationToken,
  MiniNotationTokenKind,
} from './types.js';

const OPENERS: Readonly<Record<string, string>> = {
  '[': ']',
  '<': '>',
  '{': '}',
  '(': ')',
};

const CLOSERS: ReadonlySet<string> = new Set([']', '>', '}', ')']);

const DELIMITER_KINDS: Readonly<Record<string, MiniNotationTokenKind>> = {
  '[': 'subsequence',
  ']': 'subsequence',
  '<': 'alternation',
  '>': 'alternation',
  '{': 'polymeter',
  '}': 'polymeter',
  '(': 'euclid',
  ')': 'euclid',
};

const OPERATOR_KINDS: Readonly<Record<string, MiniNotationTokenKind>> = {
  '~': 'rest',
  '-': 'rest',
  '*': 'repeat',
  '/': 'slow',
  '@': 'weight',
  _: 'weight',
  '!': 'replicate',
  '?': 'degrade',
  ',': 'parallel',
  '|': 'choice',
  ':': 'slice',
  '%': 'polymeter',
  '^': 'stepMarker',
};

const GROUP_NAMES: Readonly<Record<string, string>> = {
  '[': 'sub-sequence',
  '<': 'alternation',
  '{': 'polymeter group',
  '(': 'Euclidean call',
};

function isStepCharacter(character: string): boolean {
  return !/[\s[\]{}<>()|,:*/@_!?~.%^+-]/.test(character);
}

function isWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/.test(character);
}

/**
 * Analyses the content of a double-quoted mini-notation string. Ranges are
 * absolute document offsets, so incremental statement shifting can reuse them.
 *
 * Only clearly invalid structures are reported. Unclosed delimiters and bare
 * trailing operators are expected during live coding and are deliberately
 * suppressed; the pinned krill parser reports those at its injected closing
 * quote, which would not produce useful editor ranges.
 */
export function analyzeMiniNotation(
  documentText: string,
  startOffset: number,
  endOffset: number,
): MiniNotationAnalysis {
  const source = documentText.slice(startOffset, endOffset);
  const tokens: MiniNotationToken[] = [];
  const issues: MiniNotationIssue[] = [];
  const openers: { character: string; offset: number }[] = [];
  const numberPattern = /-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/iy;
  let index = 0;

  const rangeAt = (start: number, end: number) => offsetsToRange(documentText, start, end);
  const addToken = (kind: MiniNotationTokenKind, start: number, end: number): void => {
    tokens.push({
      kind,
      text: documentText.slice(start, end),
      range: rangeAt(start, end),
      description: TOKEN_DESCRIPTIONS[kind],
    });
  };

  while (index < source.length) {
    const character = source[index];
    if (character === undefined) {
      break;
    }
    const start = startOffset + index;

    if (isWhitespace(character)) {
      while (index < source.length && isWhitespace(source[index])) {
        index += 1;
      }
      addToken('whitespace', start, startOffset + index);
      continue;
    }

    const expectedClose = OPENERS[character];
    if (expectedClose !== undefined) {
      let lookahead = index + 1;
      while (lookahead < source.length && isWhitespace(source[lookahead])) {
        lookahead += 1;
      }
      if (source[lookahead] === expectedClose) {
        issues.push({
          code: 'empty-group',
          message: `Empty ${GROUP_NAMES[character] ?? 'group'} in mini notation`,
          range: rangeAt(start, startOffset + lookahead + 1),
        });
      }
      openers.push({ character, offset: index });
      index += 1;
      addToken(DELIMITER_KINDS[character] ?? 'step', start, startOffset + index);
      continue;
    }

    if (CLOSERS.has(character)) {
      const opener = openers[openers.length - 1];
      if (opener === undefined) {
        issues.push({
          code: 'unmatched-close',
          message: `Unexpected '${character}' in mini notation`,
          range: rangeAt(start, start + 1),
        });
      } else if (OPENERS[opener.character] !== character) {
        const expectedClose = OPENERS[opener.character];
        issues.push({
          code: 'mismatched-close',
          message: `Expected '${expectedClose}' but found '${character}' in mini notation`,
          range: rangeAt(start, start + 1),
          expectedClose,
        });
      } else {
        openers.pop();
      }
      index += 1;
      addToken(DELIMITER_KINDS[character] ?? 'step', start, startOffset + index);
      continue;
    }

    numberPattern.lastIndex = index;
    const numberMatch = numberPattern.exec(source);
    if (numberMatch !== null) {
      index += numberMatch[0].length;
      addToken('number', start, startOffset + index);
      continue;
    }

    if (character === '.' && source[index + 1] === '.') {
      index += 2;
      addToken('range', start, startOffset + index);
      continue;
    }

    if (character === '.' && isWhitespace(source[index - 1]) && isWhitespace(source[index + 1])) {
      index += 1;
      addToken('feet', start, startOffset + index);
      continue;
    }

    if (character === ',' || character === '|') {
      const previous = source[index - 1];
      const afterOpener = previous === undefined || OPENERS[previous] !== undefined;
      if (afterOpener || previous === character) {
        issues.push({
          code: 'empty-step',
          message: `Missing step around '${character}' in mini notation`,
          range: rangeAt(start, start + 1),
        });
      }
      index += 1;
      addToken(OPERATOR_KINDS[character] ?? 'parallel', start, startOffset + index);
      continue;
    }

    const operatorKind = OPERATOR_KINDS[character];
    if (operatorKind !== undefined) {
      index += 1;
      addToken(operatorKind, start, startOffset + index);
      continue;
    }

    const stepStart = index;
    while (index < source.length && isStepCharacter(source[index] ?? '')) {
      index += 1;
    }
    if (index === stepStart) {
      // Overlapping grammar characters (such as a dot outside `..` or feet)
      // and unsupported characters must still advance. They are represented
      // conservatively rather than guessed as steps or reported mid-edit.
      index += 1;
      addToken('unknown', start, startOffset + index);
      continue;
    }
    addToken('step', start, startOffset + index);
  }

  return { tokens, issues };
}
