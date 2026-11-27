import assert from 'node:assert/strict';

import { test } from 'node:test';

import { prepareRename, provideRename } from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('rename updates declarations and references for resolved user symbols', () => {
  const text = 'const pat = s("bd sd").fast(2)\npat';
  const declarationOffset = text.indexOf('pat') + 1;
  const declaration = createFeatureHarness(text, declarationOffset);
  const fromDeclaration = provideRename(declaration.context, declarationOffset, 'loop');
  assert.ok(fromDeclaration !== undefined);
  assert.deepEqual(
    fromDeclaration.edits.map((edit) => [
      edit.range.startOffset,
      edit.range.endOffset,
      edit.newText,
    ]),
    [
      [6, 9, 'loop'],
      [text.lastIndexOf('pat'), text.lastIndexOf('pat') + 3, 'loop'],
    ],
  );

  const usageOffset = text.lastIndexOf('pat') + 1;
  const usage = createFeatureHarness(text, usageOffset);
  const fromUsage = provideRename(usage.context, usageOffset, 'loop');
  assert.deepEqual(fromUsage, fromDeclaration);

  const functionText = 'function mix(a) { return a }\nmix(1)';
  const parameterOffset = functionText.indexOf('a)');
  const parameter = createFeatureHarness(functionText, parameterOffset);
  assert.deepEqual(
    provideRename(parameter.context, parameterOffset, 'value')?.edits.map(
      (edit) => [edit.range.startOffset, edit.newText] as const,
    ),
    [
      [parameterOffset, 'value'],
      [functionText.indexOf('a }'), 'value'],
    ],
  );
});

void test('rename uses the identifier range for parameters with default values', () => {
  const text = 'function f(p = 1) { return p }\nf(2)';
  const declarationOffset = text.indexOf('p =');
  const usageOffset = text.lastIndexOf('p');
  const usage = createFeatureHarness(text, usageOffset);

  const prepared = prepareRename(usage.context, usageOffset);
  assert.ok(prepared !== undefined);
  assert.equal(prepared.range.startOffset, usageOffset);
  assert.equal(prepared.range.endOffset, usageOffset + 1);
  assert.equal(prepared.placeholder, 'p');

  const edits = provideRename(usage.context, usageOffset, 'value')?.edits.map((edit) => [
    edit.range.startOffset,
    edit.newText,
  ]);
  assert.deepEqual(edits, [
    [declarationOffset, 'value'],
    [usageOffset, 'value'],
  ]);
});

void test('prepare rename exposes renamable ranges and rejects non-user symbols', () => {
  const text = 'const pat = s("bd sd").fast(2)\npat';
  const offset = text.lastIndexOf('pat') + 1;
  const usage = createFeatureHarness(text, offset);
  const prepared = prepareRename(usage.context, offset);
  assert.ok(prepared !== undefined);
  assert.equal(prepared.range.startOffset, text.lastIndexOf('pat'));
  assert.equal(prepared.range.endOffset, text.lastIndexOf('pat') + 3);
  assert.equal(prepared.placeholder, 'pat');

  const builtin = createFeatureHarness('s("bd")', 0);
  assert.equal(prepareRename(builtin.context, 0), undefined);

  const methodText = 's("bd").fast(2)';
  const methodOffset = methodText.indexOf('fast') + 1;
  const method = createFeatureHarness(methodText, methodOffset);
  assert.equal(prepareRename(method.context, methodOffset), undefined);

  const unresolvedText = 'unknownFn()';
  const unresolvedOffset = unresolvedText.indexOf('n');
  const unresolved = createFeatureHarness(unresolvedText, unresolvedOffset);
  assert.equal(prepareRename(unresolved.context, unresolvedOffset), undefined);
});

void test('rename rejects invalid names, no-ops and incomplete input', () => {
  const text = 'const pat = s("bd")';
  const offset = text.indexOf('pat') + 1;

  for (const newName of ['', '1pat', 'const', 'pat-2', 'a b', 'pat']) {
    const harness = createFeatureHarness(text, offset);
    assert.equal(provideRename(harness.context, offset, newName), undefined, newName);
  }

  const incompleteText = 'const pat = s("bd sd").fast(';
  const incompleteOffset = incompleteText.indexOf('pat') + 1;
  const incomplete = createFeatureHarness(incompleteText, incompleteOffset);
  assert.equal(prepareRename(incomplete.context, incompleteOffset), undefined);
  assert.equal(provideRename(incomplete.context, incompleteOffset, 'loop'), undefined);
});
