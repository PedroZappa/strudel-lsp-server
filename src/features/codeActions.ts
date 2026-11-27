import {
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  type DiagnosticsConfiguration,
} from '../configuration/index.js';
import type { SemanticRange } from '../semantic/index.js';

import { provideDiagnostics } from './diagnostics.js';
import type { FeatureContext, QuickFixResult } from './types.js';

function rangesOverlap(left: SemanticRange, right: SemanticRange): boolean {
  return left.startOffset <= right.endOffset && right.startOffset <= left.endOffset;
}

/**
 * Returns quick fixes for actionable diagnostics whose ranges intersect the
 * requested range. Fixes are derived from freshly computed diagnostics so a
 * stale client-supplied diagnostic cannot authorize an unsafe edit.
 */
export function provideQuickFixes(
  context: FeatureContext,
  range: SemanticRange,
  configuration: DiagnosticsConfiguration = DEFAULT_DIAGNOSTICS_CONFIGURATION,
): readonly QuickFixResult[] {
  const actions: QuickFixResult[] = [];

  for (const diagnostic of provideDiagnostics(context, configuration)) {
    const fix = diagnostic.fix;
    if (fix === undefined || !rangesOverlap(diagnostic.range, range)) {
      continue;
    }
    actions.push({
      title: fix.title,
      kind: 'quickfix',
      diagnostics: [diagnostic],
      edits: [{ range: fix.range, newText: fix.newText }],
    });
  }

  return actions;
}
