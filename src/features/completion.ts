import { miniNotationAstNodes, TOKEN_DESCRIPTIONS } from '../miniNotation/index.js';
import type { MiniNotationTokenKind } from '../miniNotation/index.js';
import { offsetsToRange } from '../syntax/textCoordinates.js';

import {
  formatStrudelType,
  listGlobalRecords,
  listPatternMethodRecords,
  recordDocumentation,
} from './metadata.js';
import { findImportPathCompletion, provideImportPathCompletion } from './importPathCompletion.js';
import { provideMiniNotationStepCompletion, stepContextAt } from './miniNotationCandidates.js';
import type {
  CompletionCandidate,
  CompletionCandidateKind,
  CompletionRequestOptions,
  CompletionResolveData,
  FeatureContext,
} from './types.js';

interface Prefix {
  readonly text: string;
  readonly startOffset: number;
  readonly member: boolean;
}

interface MiniCompletionResult {
  readonly handled: boolean;
  readonly candidates: readonly CompletionCandidate[];
}

const MINI_OPERATOR_COMPLETIONS: readonly {
  readonly kind: MiniNotationTokenKind;
  readonly label: string;
}[] = [
  { kind: 'rest', label: '~' },
  { kind: 'repeat', label: '*' },
  { kind: 'slow', label: '/' },
  { kind: 'weight', label: '@' },
  { kind: 'replicate', label: '!' },
  { kind: 'degrade', label: '?' },
  { kind: 'parallel', label: ',' },
  { kind: 'choice', label: '|' },
  { kind: 'slice', label: ':' },
  { kind: 'range', label: '..' },
  { kind: 'feet', label: '.' },
  { kind: 'subsequence', label: '[' },
  { kind: 'alternation', label: '<' },
  { kind: 'polymeter', label: '{' },
  { kind: 'polymeter', label: '%' },
  { kind: 'euclid', label: '(' },
  { kind: 'stepMarker', label: '^' },
];

function provideMiniNotationCompletion(
  context: FeatureContext,
  offset: number,
): MiniCompletionResult {
  for (const argument of context.semantic.miniNotationArguments) {
    const analysis = argument.analysis;
    if (
      analysis === undefined ||
      offset < argument.range.startOffset ||
      offset > argument.range.endOffset
    ) {
      continue;
    }

    const operator = miniNotationAstNodes(analysis.ast.root)
      .filter(
        (node) =>
          node.kind === 'operator' &&
          offset >= node.range.startOffset &&
          offset <= node.range.endOffset,
      )
      .sort(
        (left, right) =>
          left.range.endOffset -
          left.range.startOffset -
          (right.range.endOffset - right.range.startOffset),
      )[0];
    if (operator === undefined) {
      const step = stepContextAt(context, analysis, offset, true);
      return {
        handled: step !== undefined,
        candidates:
          step === undefined ? [] : provideMiniNotationStepCompletion(context, argument, step),
      };
    }

    const candidates: readonly CompletionCandidate[] = MINI_OPERATOR_COMPLETIONS.filter(
      (candidate) => candidate.label.startsWith(operator.text),
    ).map((candidate) => ({
      label: candidate.label,
      kind: 'value',
      detail: 'mini notation operator',
      documentation: TOKEN_DESCRIPTIONS[candidate.kind],
      replacementRange: operator.range,
    }));
    return {
      handled: candidates.length > 0,
      candidates,
    };
  }

  return { handled: false, candidates: [] };
}

function isIdentifierCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_$]/.test(character);
}

function findPrefix(text: string, offset: number): Prefix | undefined {
  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  let startOffset = clampedOffset;
  while (startOffset > 0 && isIdentifierCharacter(text[startOffset - 1])) {
    startOffset -= 1;
  }

  if (startOffset === clampedOffset) {
    let cursor = clampedOffset - 1;
    while (cursor >= 0 && /\s/.test(text[cursor] ?? '')) {
      cursor -= 1;
    }
    if (cursor >= 0 && text[cursor] === '.') {
      return { text: '', startOffset: clampedOffset, member: true };
    }
    return undefined;
  }

  let cursor = startOffset - 1;
  while (cursor >= 0 && /\s/.test(text[cursor] ?? '')) {
    cursor -= 1;
  }

  return {
    text: text.slice(startOffset, clampedOffset),
    startOffset,
    member: cursor >= 0 && text[cursor] === '.',
  };
}

function recordKind(record: { readonly kind: string }): CompletionCandidateKind {
  switch (record.kind) {
    case 'function':
      return 'function';
    case 'member':
      return 'method';
    case 'class':
      return 'class';
    default:
      return 'value';
  }
}

function matches(label: string, prefix: string): boolean {
  return label.toLowerCase().startsWith(prefix.toLowerCase());
}

export function provideCompletion(
  context: FeatureContext,
  offset: number,
  options: CompletionRequestOptions = {},
): readonly CompletionCandidate[] {
  const importPath = findImportPathCompletion(context, offset);
  if (importPath !== undefined) {
    return provideImportPathCompletion(context, importPath, options.workspaceFileUris ?? []);
  }

  const miniNotation = provideMiniNotationCompletion(context, offset);
  if (miniNotation.handled) {
    return miniNotation.candidates;
  }

  if (
    context.node?.kind === 'string' ||
    context.node?.kind === 'comment' ||
    context.node?.kind === 'templateString'
  ) {
    return [];
  }

  const prefix = findPrefix(context.text, offset);
  if (prefix === undefined) {
    return [];
  }

  const metadataVersion = context.database.getSnapshot().catalogVersion;
  const candidates = new Map<string, CompletionCandidate>();
  const add = (candidate: CompletionCandidate): void => {
    if (!candidates.has(candidate.label)) {
      candidates.set(candidate.label, candidate);
    }
  };

  if (prefix.member) {
    for (const record of listPatternMethodRecords(context.database)) {
      if (!matches(record.name, prefix.text)) {
        continue;
      }
      add({
        label: record.name,
        kind: 'method',
        detail: record.returnType,
        documentation: recordDocumentation(record),
        data: completionData(metadataVersion, 'method', record.name),
        replacementRange: offsetsToRange(context.text, prefix.startOffset, offset),
      });
    }
    return [...candidates.values()];
  }

  for (const symbol of context.semantic.symbols.values()) {
    if (
      symbol.kind === 'variable' ||
      symbol.kind === 'function' ||
      symbol.kind === 'parameter' ||
      symbol.kind === 'import'
    ) {
      if (matches(symbol.name, prefix.text) && symbol.declaration !== undefined) {
        add({
          label: symbol.name,
          kind: symbol.kind === 'function' ? 'function' : 'variable',
          detail: formatStrudelType(symbol.type),
          replacementRange: offsetsToRange(context.text, prefix.startOffset, offset),
        });
      }
    }
  }

  for (const record of listGlobalRecords(context.database)) {
    if (!matches(record.name, prefix.text)) {
      continue;
    }
    add({
      label: record.name,
      kind: recordKind(record),
      detail: record.returnType,
      documentation: recordDocumentation(record),
      data: completionData(metadataVersion, 'global', record.name),
      replacementRange: offsetsToRange(context.text, prefix.startOffset, offset),
    });
  }

  return [...candidates.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function completionData(
  metadataVersion: string,
  recordKind: 'global' | 'method',
  name: string,
): CompletionResolveData {
  return Object.freeze({ metadataVersion, recordKind, name });
}
