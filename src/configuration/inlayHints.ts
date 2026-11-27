import { isRecord, strudelLspSection } from './section.js';

export interface InlayHintsConfiguration {
  readonly enabled: boolean;
}

export const DEFAULT_INLAY_HINTS_CONFIGURATION: InlayHintsConfiguration = Object.freeze({
  enabled: false,
});

/** Inlay hints are opt-in; invalid or missing values retain the disabled default. */
export function parseInlayHintsConfiguration(value: unknown): InlayHintsConfiguration {
  const section = strudelLspSection(value);
  const source = section === undefined ? undefined : section.inlayHints;
  const enabled = isRecord(source) && typeof source.enabled === 'boolean' ? source.enabled : false;
  return Object.freeze({ enabled });
}
