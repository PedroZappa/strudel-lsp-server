import {
  applyDiagnosticsConfiguration,
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  type DiagnosticsConfiguration,
} from '../configuration/index.js';
import type { MiniNotationIssue } from '../miniNotation/index.js';
import type { SemanticReference } from '../semantic/index.js';
import type { SyntaxNode } from '../syntax/index.js';

import type { DiagnosticFix, FeatureContext, LanguageDiagnostic } from './types.js';

function collectOutermostErrorNodes(node: SyntaxNode, found: SyntaxNode[]): void {
  if (node.isError && node.text.trim() !== '') {
    found.push(node);
    return;
  }
  for (const child of node.children) {
    collectOutermostErrorNodes(child, found);
  }
}

function errorSnippet(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed;
}

function unknownDiagnostic(reference: SemanticReference): LanguageDiagnostic | undefined {
  if (reference.resolvedSymbolId !== undefined) {
    return undefined;
  }

  if (reference.kind === 'call') {
    return {
      range: reference.range,
      severity: 'information',
      message: `Unknown Strudel function '${reference.name}'`,
      source: 'strudel',
      code: 'unknown-global',
    };
  }

  if (reference.kind === 'method') {
    return {
      range: reference.range,
      severity: 'information',
      message: `Unknown pattern method '${reference.name}'`,
      source: 'strudel',
      code: 'unknown-pattern-method',
    };
  }

  return undefined;
}

function miniNotationFix(issue: MiniNotationIssue): DiagnosticFix | undefined {
  switch (issue.code) {
    case 'empty-group':
      return {
        title: 'Remove empty mini-notation group',
        range: issue.range,
        newText: '',
      };
    case 'unmatched-close':
      return {
        title: 'Remove unmatched mini-notation closer',
        range: issue.range,
        newText: '',
      };
    case 'mismatched-close':
      return issue.expectedClose === undefined
        ? undefined
        : {
            title: `Replace with '${issue.expectedClose}'`,
            range: issue.range,
            newText: issue.expectedClose,
          };
    case 'empty-step':
      return {
        title: 'Remove redundant mini-notation separator',
        range: issue.range,
        newText: '',
      };
  }
}

export function provideDiagnostics(
  context: FeatureContext,
  configuration: DiagnosticsConfiguration = DEFAULT_DIAGNOSTICS_CONFIGURATION,
): readonly LanguageDiagnostic[] {
  const diagnostics: LanguageDiagnostic[] = [];
  const errorNodes: SyntaxNode[] = [];
  collectOutermostErrorNodes(context.syntax.root, errorNodes);

  for (const node of errorNodes) {
    diagnostics.push({
      range: node.range,
      severity: 'warning',
      message: `Unexpected syntax near \`${errorSnippet(node.text)}\``,
      source: 'strudel',
      code: 'syntax-error',
    });
  }

  // Temporary malformed state is expected during live coding. Semantic name
  // diagnostics would be speculative there, so they are suppressed until the
  // syntax tree is clean again.
  if (context.syntax.hasErrors) {
    return applyDiagnosticsConfiguration(diagnostics, configuration);
  }

  for (const reference of context.semantic.references) {
    const diagnostic = unknownDiagnostic(reference);
    if (diagnostic !== undefined) {
      diagnostics.push(diagnostic);
    }
  }

  // Only structural mini-notation faults are reported. Unclosed delimiters and
  // trailing operators are expected mid-edit and are intentionally omitted.
  for (const argument of context.semantic.miniNotationArguments) {
    for (const issue of argument.analysis?.issues ?? []) {
      diagnostics.push({
        range: issue.range,
        severity: 'warning',
        message: issue.message,
        source: 'strudel-mini',
        code: issue.code,
        fix: miniNotationFix(issue),
      });
    }
  }

  return applyDiagnosticsConfiguration(diagnostics, configuration);
}
