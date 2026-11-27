import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { provideCompletion } from '../../src/features/index.js';
import { createFeatureHarness } from './helpers.js';

function fileUri(path: string): string {
  return pathToFileURL(`/workspace/${path}`).href;
}

void test('import-path completion offers guarded relative files at an incomplete specifier', () => {
  const text = 'import { kick } from "./li';
  const offset = text.length;
  const harness = createFeatureHarness(text, offset, {
    uri: fileUri('main.strudel'),
  });
  const workspaceFileUris = [
    fileUri('lib/kick.strudel'),
    fileUri('lib/snare.strudel'),
    fileUri('other/hat.strudel'),
    fileUri('lib/kick.js'),
  ];

  const candidates = provideCompletion(harness.context, offset, { workspaceFileUris });

  assert.deepEqual(
    candidates.map((candidate) => candidate.label),
    ['./lib/kick.strudel', './lib/snare.strudel'],
  );
  assert.equal(candidates[0]?.kind, 'file');
  assert.equal(candidates[0]?.detail, '.strudel file');
  assert.equal(candidates[0]?.replacementRange.startOffset, text.indexOf('./li'));
  assert.equal(candidates[0]?.replacementRange.endOffset, offset);
});

void test('import-path completion uses parent-relative paths and exact prefix ranges', () => {
  const text = 'import { root } from "../ro';
  const offset = text.length;
  const harness = createFeatureHarness(text, offset, {
    uri: fileUri('nested/main.strudel'),
  });

  const candidates = provideCompletion(harness.context, offset, {
    workspaceFileUris: [fileUri('root.strudel'), fileUri('nested/local.strudel')],
  });

  assert.deepEqual(
    candidates.map((candidate) => candidate.label),
    ['../root.strudel'],
  );
  assert.equal(candidates[0]?.replacementRange.startOffset, text.indexOf('../ro'));
  assert.equal(candidates[0]?.replacementRange.endOffset, offset);
});

void test('import-path completion is scoped to relative import strings', () => {
  const relativeUris = [fileUri('kick.strudel'), fileUri('lib/snare.strudel')];

  for (const specifier of [
    '/absolute',
    'package-name',
    'file:///workspace/kick.strudel',
    '..\\bad',
  ]) {
    const text = `import { kick } from "${specifier}`;
    const harness = createFeatureHarness(text, text.length, { uri: fileUri('main.strudel') });
    assert.deepEqual(
      provideCompletion(harness.context, text.length, { workspaceFileUris: relativeUris }),
      [],
      `unexpected candidates for ${specifier}`,
    );
  }

  const stringText = 's("./bd")';
  const stringOffset = stringText.indexOf('bd') + 1;
  const stringHarness = createFeatureHarness(stringText, stringOffset, {
    uri: fileUri('main.strudel'),
  });
  assert.deepEqual(
    provideCompletion(stringHarness.context, stringOffset, { workspaceFileUris: relativeUris }),
    [],
  );

  const localText = 'const kick = 1\nki';
  const localHarness = createFeatureHarness(localText, localText.length, {
    uri: fileUri('main.strudel'),
  });
  assert.equal(
    provideCompletion(localHarness.context, localText.length, {
      workspaceFileUris: relativeUris,
    }).some((candidate) => candidate.label === 'kick' && candidate.kind === 'variable'),
    true,
  );
});

void test('import-path completion has no persistent index between requests', () => {
  const text = 'import { sound } from "./';
  const offset = text.length;
  const harness = createFeatureHarness(text, offset, { uri: fileUri('main.strudel') });

  const first = provideCompletion(harness.context, offset, {
    workspaceFileUris: [fileUri('first.strudel')],
  });
  const second = provideCompletion(harness.context, offset, {
    workspaceFileUris: [fileUri('second.strudel')],
  });

  assert.deepEqual(
    first.map((candidate) => candidate.label),
    ['./first.strudel'],
  );
  assert.deepEqual(
    second.map((candidate) => candidate.label),
    ['./second.strudel'],
  );
});
