import assert from 'node:assert/strict';

import { test } from 'node:test';

import { DIAGNOSTIC_CODES } from '../../src/configuration/diagnostics.js';
import {
  provideCompletion,
  provideDiagnostics,
  provideHover,
  resolveCompletion,
} from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('completion marks the pinned deprecated global and preserves its deprecation on resolve', () => {
  const text = 'cp';
  const { context } = createFeatureHarness(text, text.length);
  const candidate = provideCompletion(context, text.length).find((item) => item.label === 'cpm');
  assert.ok(candidate !== undefined);
  assert.equal(candidate.deprecated, true);
  assert.match(candidate.documentation ?? '', /Deprecated/);
  assert.match(candidate.documentation ?? '', /cycles per minute/);

  const resolved = resolveCompletion({ label: 'cpm', data: candidate.data }, context.database);
  assert.equal(resolved.deprecated, true);
  assert.match(resolved.documentation ?? '', /Deprecated/);
});

void test('non-deprecated metadata is not marked in completion or hover', () => {
  const completionText = 'sp';
  const completionHarness = createFeatureHarness(completionText, completionText.length);
  const candidate = provideCompletion(completionHarness.context, completionText.length).find(
    (item) => item.label === 'speed',
  );
  assert.ok(candidate !== undefined);
  assert.equal(candidate.deprecated, undefined);
  assert.doesNotMatch(candidate.documentation ?? '', /Deprecated/);

  const hoverHarness = createFeatureHarness('speed', 1);
  const hover = provideHover(hoverHarness.context, 1);
  assert.ok(hover !== undefined);
  assert.doesNotMatch(hover.contents, /Deprecated/);
});

void test('hover surfaces the pinned deprecation note without a diagnostic code', () => {
  const text = 'cpm';
  const { context } = createFeatureHarness(text, 1);
  const hover = provideHover(context, 1);
  assert.ok(hover !== undefined);
  assert.match(hover.contents, /\*\*cpm\*\*/);
  assert.match(hover.contents, /Deprecated/);
  assert.match(hover.contents, /cycles per minute/);

  for (const liveText of ['cpm', 'cp', 'const x = cpm']) {
    const live = createFeatureHarness(liveText, liveText.length);
    const diagnostics = provideDiagnostics(live.context);
    assert.equal(
      diagnostics.some(
        (diagnostic) => !(DIAGNOSTIC_CODES as readonly string[]).includes(diagnostic.code ?? ''),
      ),
      false,
      `unexpected diagnostic code for ${liveText}`,
    );
  }
});
