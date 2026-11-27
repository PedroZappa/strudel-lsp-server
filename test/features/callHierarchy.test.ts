import assert from 'node:assert/strict';

import { test } from 'node:test';

import { prepareCallHierarchy, provideCallHierarchyCalls } from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

const TEXT =
  'function outer() {\n  const pat = s("bd");\n  pat;\n}\nfunction inner() {\n  outer();\n}';

function prepare(name: string) {
  const offset = TEXT.indexOf(name) + 1;
  const { context } = createFeatureHarness(TEXT, offset);
  return { context, item: prepareCallHierarchy(context, offset)[0] };
}

void test('call hierarchy prepares only verified user functions', () => {
  const outer = prepare('outer');
  assert.equal(outer.item?.name, 'outer');
  assert.equal(outer.item?.kind, 'function');
  assert.equal(outer.item?.selectionRange.startOffset, TEXT.indexOf('outer'));
  assert.equal(outer.item?.data.name, 'outer');

  const builtinOffset = TEXT.indexOf('s("bd")');
  const builtin = createFeatureHarness(TEXT, builtinOffset);
  assert.deepEqual(prepareCallHierarchy(builtin.context, builtinOffset), []);
});

void test('call hierarchy reports resolved incoming and outgoing edges', () => {
  const outer = prepare('outer');
  assert.ok(outer.item !== undefined);
  const incoming = provideCallHierarchyCalls(outer.context, outer.item.data, 'incoming');
  assert.deepEqual(
    incoming.map((call) => [call.from.name, call.fromRanges[0]?.startOffset]),
    [['inner', TEXT.indexOf('outer();', TEXT.indexOf('function inner'))]],
  );

  const innerItem = prepare('inner').item;
  assert.ok(innerItem !== undefined);
  const outgoing = provideCallHierarchyCalls(outer.context, innerItem.data, 'outgoing');
  assert.deepEqual(
    outgoing.map((call) => [call.from.name, call.fromRanges[0]?.startOffset]),
    [['outer', TEXT.indexOf('outer();', TEXT.indexOf('function inner'))]],
  );
});

void test('call hierarchy rejects stale and malformed items', () => {
  const { context, item } = prepare('outer');
  assert.ok(item !== undefined);

  assert.deepEqual(
    provideCallHierarchyCalls(context, { ...item.data, version: 999 }, 'incoming'),
    [],
  );
  assert.deepEqual(
    provideCallHierarchyCalls(context, { ...item.data, symbolId: 'unknown' }, 'incoming'),
    [],
  );
  assert.deepEqual(
    provideCallHierarchyCalls(context, { ...item.data, name: 'other' }, 'incoming'),
    [],
  );

  const incomplete = createFeatureHarness('function outer() {\n  outer(');
  assert.deepEqual(prepareCallHierarchy(incomplete.context, 9), []);
});
