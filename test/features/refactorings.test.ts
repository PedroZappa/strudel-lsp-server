import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideRefactorings } from '../../src/features/index.js';
import type { TextEditResult } from '../../src/features/index.js';
import type { SemanticRange } from '../../src/semantic/index.js';

import { createFeatureHarness } from './helpers.js';

function fullRange(text: string): SemanticRange {
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: text.length },
    startOffset: 0,
    endOffset: text.length,
  };
}

function applyEdits(text: string, edits: readonly TextEditResult[]): string {
  let result = text;
  for (const edit of [...edits].sort(
    (left, right) => right.range.startOffset - left.range.startOffset,
  )) {
    result =
      result.slice(0, edit.range.startOffset) + edit.newText + result.slice(edit.range.endOffset);
  }
  return result;
}

void test('inline constant replaces a single literal use and removes its declaration', () => {
  const text = 'const kick = "bd sd";\ns(kick);';
  const harness = createFeatureHarness(text);
  const actions = provideRefactorings(harness.context, fullRange(text));

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Inline constant 'kick'");
  assert.equal(actions[0]?.kind, 'refactor.inline');
  assert.deepEqual(actions[0]?.diagnostics, []);
  assert.equal(applyEdits(text, actions[0]?.edits ?? []), 's("bd sd");');
});

void test('inline constant handles numbers and respects the requested range', () => {
  const text = 'const tempo = 120;\nbpm(tempo);';
  const harness = createFeatureHarness(text);
  const unrelated: SemanticRange = {
    start: { line: 1, character: 0 },
    end: { line: 1, character: 3 },
    startOffset: 19,
    endOffset: 22,
  };

  assert.deepEqual(provideRefactorings(harness.context, unrelated), []);

  const actions = provideRefactorings(harness.context, fullRange(text));
  assert.equal(actions.length, 1);
  assert.equal(applyEdits(text, actions[0]?.edits ?? []), 'bpm(120);');
});

void test('extract literal adds a constant only for exact safe literals', () => {
  const text = 'const pattern = s("bd sd").fast(2);';
  const offset = text.indexOf('2);');
  const range: SemanticRange = {
    start: { line: 0, character: offset },
    end: { line: 0, character: offset + 1 },
    startOffset: offset,
    endOffset: offset + 1,
  };
  const actions = provideRefactorings(createFeatureHarness(text).context, range);
  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.kind, 'refactor.extract');
  assert.equal(actions[0]?.title, "Extract literal to constant 'extracted'");
  assert.equal(
    applyEdits(text, actions[0]?.edits ?? []),
    'const extracted = 2;\nconst pattern = s("bd sd").fast(extracted);',
  );

  const collision = 'const extracted = 1;\ns("bd").fast(2);';
  const collisionOffset = collision.indexOf('2);');
  const lineStart = collision.indexOf('\n') + 1;
  const collisionActions = provideRefactorings(createFeatureHarness(collision).context, {
    start: { line: 1, character: collisionOffset - lineStart },
    end: { line: 1, character: collisionOffset - lineStart + 1 },
    startOffset: collisionOffset,
    endOffset: collisionOffset + 1,
  });
  assert.equal(collisionActions[0]?.title, "Extract literal to constant 'extracted1'");
});

void test('extract literal rejects broad ranges and unsafe contexts', () => {
  const text = 'export const pattern = s("bd").fast(2);';
  const offset = text.indexOf('2);');
  const range: SemanticRange = {
    start: { line: 0, character: offset },
    end: { line: 0, character: offset + 1 },
    startOffset: offset,
    endOffset: offset + 1,
  };
  assert.deepEqual(provideRefactorings(createFeatureHarness(text).context, range), []);

  const stringOffset = text.indexOf('"bd"');
  assert.deepEqual(
    provideRefactorings(createFeatureHarness(text).context, {
      start: { line: 0, character: stringOffset },
      end: { line: 0, character: stringOffset + 4 },
      startOffset: stringOffset,
      endOffset: stringOffset + 4,
    }),
    [],
  );
  assert.deepEqual(provideRefactorings(createFeatureHarness(text).context, fullRange(text)), []);
});

void test('inline constant rejects unsafe or ambiguous bindings', () => {
  const cases = [
    'let kick = "bd sd";\ns(kick);',
    'const kick = "bd", snare = "sd";\ns(kick);',
    'export const kick = "bd sd";\ns(kick);',
    'const kick = "bd sd";\ns(kick);\ns(kick);',
    'const kick = s("bd");\ns(kick);',
    'const kick = `bd ${n}`;\ns(kick);',
    'const kick = "bd";\nkick = "sd";\ns(kick);',
    'const kick = ;\ns(kick);',
  ];

  for (const text of cases) {
    const harness = createFeatureHarness(text);
    assert.deepEqual(provideRefactorings(harness.context, fullRange(text)), [], text);
  }
});
