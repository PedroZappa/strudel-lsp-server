import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyDiagnosticsConfiguration,
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  parseDiagnosticsConfiguration,
  type DiagnosticsConfiguration,
} from '../../src/configuration/index.js';
import type { LanguageDiagnostic } from '../../src/features/index.js';

function diagnostic(code: string, severity: LanguageDiagnostic['severity']): LanguageDiagnostic {
  return {
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 },
      startOffset: 0,
      endOffset: 1,
    },
    severity,
    message: `test ${code}`,
    source: 'test',
    code,
  };
}

void test('diagnostics configuration defaults are unchanged for missing or invalid values', () => {
  assert.deepEqual(parseDiagnosticsConfiguration(undefined), DEFAULT_DIAGNOSTICS_CONFIGURATION);
  assert.deepEqual(parseDiagnosticsConfiguration(null), DEFAULT_DIAGNOSTICS_CONFIGURATION);
  assert.deepEqual(parseDiagnosticsConfiguration('enabled'), DEFAULT_DIAGNOSTICS_CONFIGURATION);

  const invalid = parseDiagnosticsConfiguration({
    diagnostics: {
      enabled: 'yes',
      severity: {
        'syntax-error': 'critical',
        'unknown-global': 3,
        'not-a-code': 'off',
      },
    },
  });
  assert.equal(invalid.enabled, true);
  assert.deepEqual(invalid.severity, {});
});

void test('diagnostics configuration accepts workspace/configuration and notification shapes', () => {
  const requested = parseDiagnosticsConfiguration({
    diagnostics: {
      enabled: true,
      severity: { 'syntax-error': 'error', 'unknown-global': 'off' },
    },
  });
  assert.equal(requested.enabled, true);
  assert.equal(requested.severity['syntax-error'], 'error');
  assert.equal(requested.severity['unknown-global'], 'off');

  const notified = parseDiagnosticsConfiguration({
    settings: {
      strudelLsp: {
        diagnostics: {
          enabled: false,
          severity: { 'empty-step': 'hint' },
        },
      },
    },
  });
  assert.equal(notified.enabled, false);
  assert.equal(notified.severity['empty-step'], 'hint');
});

void test('diagnostics configuration filters, suppresses and remaps severities', () => {
  const diagnostics = [
    diagnostic('syntax-error', 'warning'),
    diagnostic('unknown-global', 'information'),
    diagnostic('empty-step', 'warning'),
    diagnostic('untagged', 'warning'),
  ];

  const configuration: DiagnosticsConfiguration = parseDiagnosticsConfiguration({
    diagnostics: {
      severity: {
        'syntax-error': 'error',
        'unknown-global': 'off',
        'empty-step': 'hint',
      },
    },
  });

  const result = applyDiagnosticsConfiguration(diagnostics, configuration);
  assert.deepEqual(
    result.map((item) => [item.code, item.severity]),
    [
      ['syntax-error', 'error'],
      ['empty-step', 'hint'],
      ['untagged', 'warning'],
    ],
  );
  assert.deepEqual(
    diagnostics.map((item) => item.severity),
    ['warning', 'information', 'warning', 'warning'],
  );
});

void test('disabling diagnostics suppresses every diagnostic', () => {
  const configuration = parseDiagnosticsConfiguration({ diagnostics: { enabled: false } });
  assert.deepEqual(
    applyDiagnosticsConfiguration([diagnostic('syntax-error', 'warning')], configuration),
    [],
  );
});
