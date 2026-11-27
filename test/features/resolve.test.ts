import assert from 'node:assert/strict';

import { test } from 'node:test';

import {
  provideCompletion,
  provideWorkspaceSymbols,
  resolveCompletion,
  resolveWorkspaceSymbol,
} from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('completion resolve enriches items from a valid metadata token', () => {
  const text = 'sp';
  const { context } = createFeatureHarness(text, text.length);
  const candidate = provideCompletion(context, text.length).find((item) => item.label === 'speed');
  assert.ok(candidate?.data !== undefined);

  const resolved = resolveCompletion({ label: 'speed', data: candidate.data }, context.database);
  assert.equal(resolved.detail, 'Pattern');
  assert.match(resolved.documentation ?? '', /speed of sample playback/);
});

void test('completion resolve rejects stale, mismatched and malformed tokens', () => {
  const text = 'sp';
  const { context } = createFeatureHarness(text, text.length);
  const candidate = provideCompletion(context, text.length).find((item) => item.label === 'speed');
  assert.ok(candidate?.data !== undefined);

  assert.deepEqual(
    resolveCompletion(
      { label: 'speed', data: { ...candidate.data, metadataVersion: 'stale' } },
      context.database,
    ),
    {},
  );
  assert.deepEqual(
    resolveCompletion({ label: 'other', data: candidate.data }, context.database),
    {},
  );
  assert.deepEqual(
    resolveCompletion(
      { label: 'speed', data: { ...candidate.data, recordKind: 'unknown' } },
      context.database,
    ),
    {},
  );
  assert.deepEqual(resolveCompletion({ label: 'speed' }, context.database), {});
});

void test('workspace symbol resolve returns only a verified location range', () => {
  const { context } = createFeatureHarness('const alpha = 1;', 7);
  const symbol = provideWorkspaceSymbols([context], 'alpha')[0];
  assert.ok(symbol?.data !== undefined);

  const resolved = resolveWorkspaceSymbol({ name: 'alpha', data: symbol.data }, context.database);
  assert.deepEqual(resolved.range, symbol.range);
});

void test('workspace symbol resolve rejects client-supplied or mismatched data', () => {
  const { context } = createFeatureHarness('const alpha = 1;', 7);
  const symbol = provideWorkspaceSymbols([context], 'alpha')[0];
  assert.ok(symbol?.data !== undefined);

  assert.deepEqual(
    resolveWorkspaceSymbol(
      { name: 'alpha', data: { ...symbol.data, range: { ...symbol.range, startOffset: -1 } } },
      context.database,
    ),
    {},
  );
  assert.deepEqual(
    resolveWorkspaceSymbol({ name: 'other', data: symbol.data }, context.database),
    {},
  );
  assert.deepEqual(
    resolveWorkspaceSymbol(
      { name: 'alpha', data: { uri: 'file:///etc/passwd' } },
      context.database,
    ),
    {},
  );
});
