import type { LanguageDiagnostic } from '../features/types.js';

export const DIAGNOSTIC_CODES = [
  'syntax-error',
  'unknown-global',
  'unknown-pattern-method',
  'empty-group',
  'unmatched-close',
  'mismatched-close',
  'empty-step',
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export const CONFIGURED_DIAGNOSTIC_SEVERITIES = [
  'error',
  'warning',
  'information',
  'hint',
  'off',
] as const;

export type ConfiguredDiagnosticSeverity = (typeof CONFIGURED_DIAGNOSTIC_SEVERITIES)[number];

export interface DiagnosticsConfiguration {
  readonly enabled: boolean;
  readonly severity: Readonly<Partial<Record<DiagnosticCode, ConfiguredDiagnosticSeverity>>>;
}

export const DEFAULT_DIAGNOSTICS_CONFIGURATION: DiagnosticsConfiguration = Object.freeze({
  enabled: true,
  severity: Object.freeze({}),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asConfiguredSeverity(value: unknown): ConfiguredDiagnosticSeverity | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return CONFIGURED_DIAGNOSTIC_SEVERITIES.some((severity) => severity === value)
    ? (value as ConfiguredDiagnosticSeverity)
    : undefined;
}

function diagnosticsSection(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  let current = value;
  if (isRecord(current.settings)) {
    current = current.settings;
  }
  if (isRecord(current.strudelLsp)) {
    current = current.strudelLsp;
  }
  return isRecord(current.diagnostics) ? current.diagnostics : current;
}

export function parseDiagnosticsConfiguration(value: unknown): DiagnosticsConfiguration {
  const source = diagnosticsSection(value);
  if (source === undefined) {
    return DEFAULT_DIAGNOSTICS_CONFIGURATION;
  }

  const enabled = typeof source.enabled === 'boolean' ? source.enabled : true;
  const severity: Partial<Record<DiagnosticCode, ConfiguredDiagnosticSeverity>> = {};

  if (isRecord(source.severity)) {
    for (const code of DIAGNOSTIC_CODES) {
      const configured = asConfiguredSeverity(source.severity[code]);
      if (configured !== undefined) {
        severity[code] = configured;
      }
    }
  }

  return Object.freeze({ enabled, severity: Object.freeze(severity) });
}

export function applyDiagnosticsConfiguration(
  diagnostics: readonly LanguageDiagnostic[],
  configuration: DiagnosticsConfiguration,
): readonly LanguageDiagnostic[] {
  if (!configuration.enabled) {
    return [];
  }

  const overrides: Readonly<Record<string, ConfiguredDiagnosticSeverity | undefined>> =
    configuration.severity;

  return diagnostics.flatMap((diagnostic) => {
    const override = diagnostic.code === undefined ? undefined : overrides[diagnostic.code];
    if (override === 'off') {
      return [];
    }
    if (override === undefined || override === diagnostic.severity) {
      return [diagnostic];
    }
    return [{ ...diagnostic, severity: override }];
  });
}
