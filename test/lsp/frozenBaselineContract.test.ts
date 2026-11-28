import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CONFIGURED_DIAGNOSTIC_SEVERITIES,
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  DEFAULT_INLAY_HINTS_CONFIGURATION,
  DIAGNOSTIC_CODES,
  parseDiagnosticsConfiguration,
  parseInlayHintsConfiguration,
} from '../../src/configuration/index.js';
import { RawStdioClient } from '../helpers/rawStdioClient.js';

const FROZEN_CAPABILITIES = {
  textDocumentSync: 2,
  completionProvider: { triggerCharacters: ['.'], resolveProvider: true },
  codeActionProvider: {
    codeActionKinds: ['quickfix', 'refactor.inline', 'refactor.extract'],
    resolveProvider: false,
  },
  hoverProvider: true,
  signatureHelpProvider: { triggerCharacters: ['(', ','] },
  definitionProvider: true,
  referencesProvider: true,
  documentHighlightProvider: true,
  callHierarchyProvider: true,
  documentSymbolProvider: true,
  workspaceSymbolProvider: { resolveProvider: true },
  documentFormattingProvider: true,
  documentRangeFormattingProvider: true,
  foldingRangeProvider: true,
  selectionRangeProvider: true,
  inlayHintProvider: true,
  semanticTokensProvider: {
    legend: {
      tokenTypes: ['function', 'method', 'variable', 'parameter', 'number', 'operator'],
      tokenModifiers: ['declaration', 'defaultLibrary'],
    },
    range: false,
    full: true,
  },
  renameProvider: { prepareProvider: true },
};

const UNSUPPORTED_PROVIDERS = [
  'declarationProvider',
  'typeDefinitionProvider',
  'implementationProvider',
  'documentLinkProvider',
  'colorProvider',
  'codeLensProvider',
  'documentOnTypeFormattingProvider',
  'linkedEditingRangeProvider',
  'inlineValueProvider',
  'monikerProvider',
  'diagnosticProvider',
];

const FROZEN_DIAGNOSTIC_CODES = [
  'syntax-error',
  'unknown-global',
  'unknown-pattern-method',
  'empty-group',
  'unmatched-close',
  'mismatched-close',
  'empty-step',
];

const FROZEN_SEVERITIES = ['error', 'warning', 'information', 'hint', 'off'];

const FROZEN_SEVERITY_MAP = {
  'syntax-error': 'error',
  'unknown-global': 'warning',
  'unknown-pattern-method': 'information',
  'empty-group': 'hint',
  'unmatched-close': 'off',
  'mismatched-close': 'error',
  'empty-step': 'warning',
};

void test('initialize advertises exactly the re-frozen v1.0.0 capability matrix', async (t) => {
  const client = new RawStdioClient();
  t.after(async () => {
    await client.terminate();
  });

  const response = await client.request('initialize', {
    processId: process.pid,
    rootUri: null,
    capabilities: {},
    workspaceFolders: null,
  });
  assert.equal(response.error, undefined);
  assert.deepEqual(response.result, { capabilities: FROZEN_CAPABILITIES });

  const capabilities = (response.result as { capabilities: Record<string, unknown> }).capabilities;
  for (const provider of UNSUPPORTED_PROVIDERS) {
    assert.equal(capabilities[provider], undefined, `${provider} must stay unadvertised`);
  }

  assert.equal(await client.shutdownAndExit(), 0);
  assert.deepEqual(client.stdoutViolations, []);
  assert.equal(client.pendingStdoutBytes, 0);
  assert.equal(client.stderrText, '');
});

void test('frozen configuration schema accepts only documented keys and values', () => {
  assert.deepEqual(parseDiagnosticsConfiguration(undefined), DEFAULT_DIAGNOSTICS_CONFIGURATION);
  assert.deepEqual(parseInlayHintsConfiguration(undefined), DEFAULT_INLAY_HINTS_CONFIGURATION);

  const settings = {
    settings: {
      strudelLsp: {
        diagnostics: { enabled: true, severity: FROZEN_SEVERITY_MAP },
        inlayHints: { enabled: true },
        strudelVersion: '1.2.6',
        parser: { executable: 'untrusted' },
        trace: 'verbose',
        internalEngineTuning: { maxIterations: 1 },
      },
    },
  };
  assert.deepEqual(parseDiagnosticsConfiguration(settings), {
    enabled: true,
    severity: FROZEN_SEVERITY_MAP,
  });
  assert.deepEqual(parseInlayHintsConfiguration(settings), { enabled: true });

  const invalid = {
    settings: {
      strudelLsp: {
        diagnostics: {
          enabled: 'yes',
          severity: {
            ...FROZEN_SEVERITY_MAP,
            'unknown-sample': 'off',
            'syntax-error': 'critical',
          },
        },
        inlayHints: { enabled: 1 },
      },
    },
  };
  // The invalid severity and the unknown code are ignored; valid codes remain configured.
  assert.deepEqual(parseDiagnosticsConfiguration(invalid), {
    enabled: true,
    severity: {
      'unknown-global': 'warning',
      'unknown-pattern-method': 'information',
      'empty-group': 'hint',
      'unmatched-close': 'off',
      'mismatched-close': 'error',
      'empty-step': 'warning',
    },
  });
  assert.deepEqual(parseInlayHintsConfiguration(invalid), DEFAULT_INLAY_HINTS_CONFIGURATION);
});

void test('frozen diagnostic-code identity and severity vocabulary are exact', () => {
  assert.deepEqual([...DIAGNOSTIC_CODES], FROZEN_DIAGNOSTIC_CODES);
  assert.deepEqual([...CONFIGURED_DIAGNOSTIC_SEVERITIES], FROZEN_SEVERITIES);
  assert.equal(FROZEN_DIAGNOSTIC_CODES.includes('unknown-sample'), false);
});
