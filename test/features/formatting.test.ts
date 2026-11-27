import assert from 'node:assert/strict';

import { test } from 'node:test';

import {
  provideFormatting,
  provideRangeFormatting,
  type FormattingOptions,
} from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

const SPACES: FormattingOptions = { tabSize: 2, insertSpaces: true };

function editSummary(text: string, options: FormattingOptions = SPACES): (number | string)[][] {
  const { context } = createFeatureHarness(text);
  return provideFormatting(context, options).edits.map((edit) => [
    edit.range.start.line,
    edit.range.end.character,
    edit.newText,
  ]);
}

void test('formatting normalizes statement and block indentation', () => {
  const text = 'function f(n) {\n    return s("bd").gain(n)\n  }\nf(1)';
  assert.deepEqual(editSummary(text), [
    [1, 4, '  '],
    [2, 2, ''],
  ]);

  const nested = 'function f() {\nreturn function g() {\n      return 1\n  }\n}';
  assert.deepEqual(editSummary(nested), [
    [1, 0, '  '],
    [2, 6, '    '],
  ]);
});

void test('formatting uses client tab preferences', () => {
  const text = 'function f() {\nreturn 1\n}';
  assert.deepEqual(editSummary(text, { tabSize: 4, insertSpaces: false }), [[1, 0, '\t']]);
  assert.deepEqual(editSummary(text, { tabSize: 4, insertSpaces: true }), [[1, 0, '    ']]);
});

void test('formatting preserves strings, templates, comments and blank lines', () => {
  const text = '// note\nconst t = `bd\n   sd`\n\nfoo()';
  assert.deepEqual(editSummary(text), []);

  const indentedComment = '// top\nfunction f() {\n // inner\nreturn 1\n}';
  assert.deepEqual(editSummary(indentedComment), [
    [2, 1, '  '],
    [3, 0, '  '],
  ]);
});

void test('formatting leaves errors and already formatted documents unchanged', () => {
  assert.deepEqual(editSummary('const pat = s("bd").fast('), []);
  assert.deepEqual(editSummary('function f() {\n  return 1\n}\nf()'), []);
});

void test('range formatting returns only full-document edits inside the requested lines', () => {
  const text = 'function f() {\n    return 1\n  }\nf()';
  const { context, document } = createFeatureHarness(text);
  const start = { line: 1, character: 0 };
  const end = { line: 2, character: 0 };
  const result = provideRangeFormatting(context, SPACES, {
    start,
    end,
    startOffset: document.offsetAt(start),
    endOffset: document.offsetAt(end),
  });

  assert.deepEqual(
    result.edits.map((edit) => [edit.range.start.line, edit.range.end.character, edit.newText]),
    [[1, 4, '  ']],
  );

  const outside = provideRangeFormatting(context, SPACES, {
    start: { line: 3, character: 0 },
    end: { line: 3, character: 1 },
    startOffset: text.indexOf('f()', text.lastIndexOf('\n')),
    endOffset: text.length,
  });
  assert.deepEqual(outside.edits, []);
});
