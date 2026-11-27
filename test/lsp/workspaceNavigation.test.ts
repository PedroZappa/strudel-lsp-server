import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideWorkspaceDefinition, provideWorkspaceReferences } from '../../src/lsp/index.js';

import { createFeatureHarness } from '../features/helpers.js';

const MAIN_URI = 'file:///workspace/main.strudel';
const LIB_URI = 'file:///workspace/lib.strudel';
const MAIN_TEXT = 'import { kick } from "./lib.strudel";\nconst pat = kick;';
const LIB_TEXT = 'export const kick = s("bd");\nkick;';

function harnesses() {
  const mainOffset = MAIN_TEXT.indexOf('kick') + 1;
  const libOffset = LIB_TEXT.indexOf('kick') + 1;
  const main = createFeatureHarness(MAIN_TEXT, mainOffset, { uri: MAIN_URI });
  const lib = createFeatureHarness(LIB_TEXT, libOffset, { uri: LIB_URI });
  return { main, lib, mainOffset, libOffset, contexts: [main.context, lib.context] as const };
}

void test('workspace definition resolves an explicit relative import to an exported declaration', () => {
  const { main, mainOffset, contexts } = harnesses();
  const definition = provideWorkspaceDefinition(main.context, contexts, mainOffset);
  assert.equal(definition?.uri, LIB_URI);
  assert.equal(definition?.range.startOffset, LIB_TEXT.indexOf('kick'));
  assert.equal(definition?.range.endOffset, LIB_TEXT.indexOf('kick') + 4);
});

void test('workspace references merge only verified import edges', () => {
  const { main, mainOffset, contexts } = harnesses();
  const fromImport = provideWorkspaceReferences(main.context, contexts, mainOffset, true);
  assert.deepEqual(
    fromImport.map((location) => [location.uri, location.range.startOffset]),
    [
      [MAIN_URI, MAIN_TEXT.indexOf('kick')],
      [LIB_URI, LIB_TEXT.indexOf('kick')],
      [LIB_URI, LIB_TEXT.lastIndexOf('kick')],
    ],
  );
  assert.deepEqual(
    provideWorkspaceReferences(main.context, contexts, mainOffset, false).map(
      (location) => location.uri,
    ),
    [LIB_URI],
  );

  const { lib, libOffset } = harnesses();
  const fromExport = provideWorkspaceReferences(lib.context, contexts, libOffset, true);
  assert.deepEqual(
    fromExport.map((location) => location.uri),
    [LIB_URI, LIB_URI, MAIN_URI],
  );
});

void test('workspace navigation rejects unsafe specifiers and unscanned files', () => {
  for (const specifier of [
    '/etc/passwd.strudel',
    'https://example.invalid/lib.strudel',
    './lib.js',
  ]) {
    const text = `import { kick } from "${specifier}";\nconst pat = kick;`;
    const offset = text.indexOf('kick') + 1;
    const current = createFeatureHarness(text, offset, { uri: MAIN_URI });
    const lib = createFeatureHarness(LIB_TEXT, LIB_TEXT.indexOf('kick') + 1, { uri: LIB_URI });
    assert.equal(
      provideWorkspaceDefinition(current.context, [current.context, lib.context], offset),
      undefined,
      specifier,
    );
  }

  const lib = createFeatureHarness(LIB_TEXT, LIB_TEXT.indexOf('kick') + 1, { uri: LIB_URI });
  const incomplete = 'import { kick } from "./lib.strudel\nconst pat = kick;';
  const incompleteOffset = incomplete.indexOf('kick') + 1;
  const incompleteContext = createFeatureHarness(incomplete, incompleteOffset, {
    uri: MAIN_URI,
  });
  assert.equal(
    provideWorkspaceDefinition(
      incompleteContext.context,
      [incompleteContext.context, lib.context],
      incompleteOffset,
    ),
    undefined,
  );

  const { main, mainOffset } = harnesses();
  const unrelated = createFeatureHarness('const other = 1;', 6, {
    uri: 'file:///workspace/other.strudel',
  });
  assert.equal(provideWorkspaceDefinition(main.context, [main.context], mainOffset), undefined);
  assert.equal(
    provideWorkspaceDefinition(main.context, [main.context, unrelated.context], mainOffset),
    undefined,
  );
});

void test('workspace navigation does not merge unrelated same-name symbols', () => {
  const targetText = 'const kick = s("sd");';
  const target = createFeatureHarness(targetText, targetText.indexOf('kick') + 1, {
    uri: LIB_URI,
  });
  const { main, mainOffset } = harnesses();
  assert.equal(
    provideWorkspaceDefinition(main.context, [main.context, target.context], mainOffset),
    undefined,
  );
  assert.deepEqual(
    provideWorkspaceReferences(main.context, [main.context, target.context], mainOffset, true).map(
      (location) => location.uri,
    ),
    [MAIN_URI],
  );
});
