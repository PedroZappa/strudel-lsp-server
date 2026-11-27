import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_INLAY_HINTS_CONFIGURATION,
  parseInlayHintsConfiguration,
} from '../../src/configuration/index.js';

void test('inlay hints are disabled for missing or invalid configuration', () => {
  assert.deepEqual(parseInlayHintsConfiguration(undefined), DEFAULT_INLAY_HINTS_CONFIGURATION);
  assert.deepEqual(parseInlayHintsConfiguration(null), DEFAULT_INLAY_HINTS_CONFIGURATION);
  assert.deepEqual(parseInlayHintsConfiguration('enabled'), DEFAULT_INLAY_HINTS_CONFIGURATION);
  assert.deepEqual(
    parseInlayHintsConfiguration({ inlayHints: { enabled: 'yes' } }),
    DEFAULT_INLAY_HINTS_CONFIGURATION,
  );
});

void test('inlay hints accept workspace/configuration and notification shapes', () => {
  assert.deepEqual(parseInlayHintsConfiguration({ inlayHints: { enabled: true } }), {
    enabled: true,
  });
  assert.deepEqual(
    parseInlayHintsConfiguration({
      settings: { strudelLsp: { inlayHints: { enabled: true } } },
    }),
    { enabled: true },
  );
  assert.deepEqual(
    parseInlayHintsConfiguration({ inlayHints: { enabled: false } }),
    DEFAULT_INLAY_HINTS_CONFIGURATION,
  );
});
