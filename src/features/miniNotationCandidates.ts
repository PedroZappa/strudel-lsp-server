import type { LanguageMetadataRecord } from '../languageDatabase/index.js';
import {
  isMiniNotationStepText,
  type MiniNotationAnalysis,
  type MiniNotationToken,
} from '../miniNotation/index.js';
import type { MiniNotationArgument, SemanticRange } from '../semantic/index.js';
import type { SyntaxNode } from '../syntax/index.js';
import { offsetsToRange } from '../syntax/textCoordinates.js';

import { listSampleRecords, recordDocumentation } from './metadata.js';
import type { CompletionCandidate, FeatureContext, HoverResult } from './types.js';

export interface MiniNotationStepContext {
  readonly token: MiniNotationToken;
  readonly prefix: string;
}

interface LiteralSampleKey {
  readonly name: string;
  readonly range: SemanticRange;
}

const NOTE_NAME_PATTERN = /^[A-Ga-g][b#]*-?\d*$/;
const NOTE_NAME_TOKEN_PATTERN = /(?<![A-Za-z0-9#])[A-Ga-g][b#]*-?\d*(?![A-Za-z0-9#])/g;
const NOTE_NAME_EXAMPLES_MARKER = 'Examples of valid note names:';

export function findMiniNotationStepToken(
  analysis: MiniNotationAnalysis,
  offset: number,
  includeEnd: boolean,
): MiniNotationToken | undefined {
  return analysis.tokens.find(
    (token) =>
      token.kind === 'step' &&
      offset >= token.range.startOffset &&
      (includeEnd ? offset <= token.range.endOffset : offset < token.range.endOffset),
  );
}

export function stepContextAt(
  context: FeatureContext,
  analysis: MiniNotationAnalysis,
  offset: number,
  includeEnd: boolean,
): MiniNotationStepContext | undefined {
  const token = findMiniNotationStepToken(analysis, offset, includeEnd);
  if (token === undefined) {
    return undefined;
  }
  const prefixEnd = Math.max(token.range.startOffset, Math.min(offset, token.range.endOffset));
  return { token, prefix: context.text.slice(token.range.startOffset, prefixEnd) };
}

function unquoteObjectKey(text: string): string | undefined {
  const quote = text[0];
  if (quote !== '"' && quote !== "'" && quote !== '`') {
    return undefined;
  }
  if (text.length < 2 || !text.endsWith(quote) || text.includes('\\')) {
    return undefined;
  }
  return text.slice(1, -1);
}

function objectKeyName(node: SyntaxNode): string | undefined {
  if (node.isMissing) {
    return undefined;
  }
  if (node.kind === 'identifier') {
    return node.text;
  }
  if (node.kind === 'string') {
    return unquoteObjectKey(node.text);
  }
  return undefined;
}

function literalSampleKeys(syntax: SyntaxNode): readonly LiteralSampleKey[] {
  const keys = new Map<string, LiteralSampleKey>();

  const visit = (node: SyntaxNode): void => {
    if (node.kind === 'callExpression') {
      const callee = node.children.find(
        (child) => child.kind === 'identifier' && child.text === 'samples',
      );
      const args = node.children.find((child) => child.kind === 'arguments');
      const object =
        callee === undefined ? undefined : args?.children.find((child) => child.kind === 'object');
      if (object !== undefined) {
        for (const pair of object.children) {
          if (pair.kind !== 'pair' || pair.isMissing) {
            continue;
          }
          const keyNode = pair.children[0];
          if (keyNode === undefined) {
            continue;
          }
          const name = objectKeyName(keyNode);
          if (name === undefined || !isMiniNotationStepText(name) || keys.has(name)) {
            continue;
          }
          keys.set(name, { name, range: keyNode.range });
        }
      }
    }
    for (const child of node.children) {
      visit(child);
    }
  };

  visit(syntax);
  return [...keys.values()];
}

function isDocumentedNoteName(value: string): boolean {
  return NOTE_NAME_PATTERN.test(value) && isMiniNotationStepText(value);
}

function noteNamesFromRecord(record: LanguageMetadataRecord): readonly string[] {
  const names = new Set<string>();

  for (const example of record.examples) {
    for (const match of example.matchAll(NOTE_NAME_TOKEN_PATTERN)) {
      if (isDocumentedNoteName(match[0] ?? '')) {
        names.add(match[0] ?? '');
      }
    }
  }

  const description = record.description;
  const markerIndex = description?.indexOf(NOTE_NAME_EXAMPLES_MARKER) ?? -1;
  if (description !== undefined && markerIndex >= 0) {
    const exampleText = description
      .slice(markerIndex + NOTE_NAME_EXAMPLES_MARKER.length)
      .split(' You ')[0]
      ?.replace(/\.$/, '');
    for (const part of (exampleText ?? '').split(',')) {
      const candidate = part.trim();
      if (isDocumentedNoteName(candidate)) {
        names.add(candidate);
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

function matchesPrefix(label: string, prefix: string): boolean {
  return label.toLowerCase().startsWith(prefix.toLowerCase());
}

export function provideMiniNotationStepCompletion(
  context: FeatureContext,
  argument: MiniNotationArgument,
  step: MiniNotationStepContext,
): readonly CompletionCandidate[] {
  const candidates = new Map<string, CompletionCandidate>();
  const add = (candidate: CompletionCandidate): void => {
    if (!candidates.has(candidate.label) && matchesPrefix(candidate.label, step.prefix)) {
      candidates.set(candidate.label, candidate);
    }
  };
  const replacementRange = step.token.range;

  if (argument.ownerName === 's' || argument.ownerName === 'sound') {
    for (const key of literalSampleKeys(context.syntax.root)) {
      const line = offsetsToRange(context.text, key.range.startOffset, key.range.endOffset).start
        .line;
      add({
        label: key.name,
        kind: 'value',
        detail: 'sample key',
        documentation: `Defined by a literal \`samples({...})\` key in this document on line ${
          line + 1
        }.`,
        replacementRange,
      });
    }

    const snapshot = context.database.getSnapshot();
    for (const record of listSampleRecords(context.database)) {
      add({
        label: record.name,
        kind: 'value',
        detail: `catalog sample · ${snapshot.catalogVersion}`,
        documentation: [
          recordDocumentation(record),
          `Catalog version: \`${snapshot.catalogVersion}\`.`,
        ]
          .filter((section): section is string => section !== undefined)
          .join('\n\n'),
        replacementRange,
      });
    }
  }

  if (argument.ownerName === 'note') {
    const record = context.database.getGlobalRecord('note');
    if (record !== undefined) {
      for (const name of noteNamesFromRecord(record)) {
        add({
          label: name,
          kind: 'value',
          detail: 'note name',
          documentation: recordDocumentation(record),
          replacementRange,
        });
      }
    }
  }

  return [...candidates.values()];
}

export function provideMiniNotationStepHover(
  context: FeatureContext,
  argument: MiniNotationArgument,
  step: MiniNotationStepContext,
): HoverResult | undefined {
  const text = step.token.text;

  if (argument.ownerName === 's' || argument.ownerName === 'sound') {
    const key = literalSampleKeys(context.syntax.root).find((candidate) => candidate.name === text);
    if (key !== undefined) {
      const line = offsetsToRange(context.text, key.range.startOffset, key.range.endOffset).start
        .line;
      return {
        range: step.token.range,
        contents: [
          `**${text}** — sample key`,
          `Defined by a literal \`samples({...})\` key in this document on line ${line + 1}.`,
          `_Owner: ${argument.ownerName}_`,
        ].join('\n\n'),
      };
    }

    const record = context.database.getSampleRecord(text);
    if (record !== undefined) {
      const catalogVersion = context.database.getSnapshot().catalogVersion;
      const sections = [
        `**${text}** — catalog sample`,
        recordDocumentation(record),
        `Catalog version: \`${catalogVersion}\`.`,
        `_Owner: ${argument.ownerName}_`,
      ];
      return {
        range: step.token.range,
        contents: sections
          .filter((section): section is string => section !== undefined)
          .join('\n\n'),
      };
    }
  }

  if (argument.ownerName === 'note') {
    const record = context.database.getGlobalRecord('note');
    if (record !== undefined && noteNamesFromRecord(record).includes(text)) {
      const documentation = recordDocumentation(record);
      return {
        range: step.token.range,
        contents: [`**${text}** — note name`, documentation, '_Owner: note_']
          .filter((section): section is string => section !== undefined)
          .join('\n\n'),
      };
    }
  }

  return undefined;
}
