import { offsetsToRange } from '../syntax/textCoordinates.js';

import {
  formatStrudelType,
  listGlobalRecords,
  listPatternMethodRecords,
  recordDocumentation,
} from './metadata.js';
import type { CompletionCandidate, CompletionCandidateKind, FeatureContext } from './types.js';

interface Prefix {
  readonly text: string;
  readonly startOffset: number;
  readonly member: boolean;
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
): readonly CompletionCandidate[] {
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
      replacementRange: offsetsToRange(context.text, prefix.startOffset, offset),
    });
  }

  return [...candidates.values()].sort((left, right) => left.label.localeCompare(right.label));
}
