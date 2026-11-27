import { miniNotationAstNodes } from '../miniNotation/index.js';
import { findReferenceAt, findSymbolAt, resolveReference } from '../semantic/index.js';

import { formatStrudelType, metadataRecordForSymbol, recordDocumentation } from './metadata.js';
import { provideMiniNotationStepHover, stepContextAt } from './miniNotationCandidates.js';
import type { FeatureContext, HoverResult } from './types.js';

function symbolLabel(kind: string): string {
  switch (kind) {
    case 'builtin':
      return 'Strudel global';
    case 'method':
      return 'Pattern method';
    case 'sample':
      return 'Sample';
    case 'function':
      return 'Function';
    case 'parameter':
      return 'Parameter';
    case 'import':
      return 'Import';
    default:
      return 'Variable';
  }
}

function provideMiniNotationHover(
  context: FeatureContext,
  offset: number,
): HoverResult | undefined {
  for (const argument of context.semantic.miniNotationArguments) {
    const analysis = argument.analysis;
    if (
      analysis === undefined ||
      offset < argument.range.startOffset ||
      offset >= argument.range.endOffset
    ) {
      continue;
    }

    const node = miniNotationAstNodes(analysis.ast.root)
      .filter(
        (candidate) =>
          candidate.kind !== 'sequence' &&
          offset >= candidate.range.startOffset &&
          offset < candidate.range.endOffset,
      )
      .sort(
        (left, right) =>
          left.range.endOffset -
          left.range.startOffset -
          (right.range.endOffset - right.range.startOffset),
      )[0];
    const token = analysis.tokens.find(
      (candidate) =>
        candidate.kind !== 'whitespace' &&
        offset >= candidate.range.startOffset &&
        offset < candidate.range.endOffset,
    );
    const nodeLength =
      node === undefined ? Number.POSITIVE_INFINITY : node.range.endOffset - node.range.startOffset;
    const tokenLength =
      token === undefined
        ? Number.POSITIVE_INFINITY
        : token.range.endOffset - token.range.startOffset;
    const target = nodeLength <= tokenLength ? node : token;
    if (target === undefined) {
      continue;
    }
    const label =
      token !== undefined && tokenLength < nodeLength
        ? token.kind
        : (node?.operator ?? node?.kind ?? token?.kind);

    const step = stepContextAt(context, analysis, offset, false);
    if (
      step?.token.range.startOffset === target.range.startOffset &&
      step.token.range.endOffset === target.range.endOffset
    ) {
      const enriched = provideMiniNotationStepHover(context, argument, step);
      if (enriched !== undefined) {
        return enriched;
      }
    }

    return {
      range: target.range,
      contents: [
        `\`${target.text}\` — mini notation ${label}`,
        target.description,
        `_Owner: ${argument.ownerName}_`,
      ].join('\n\n'),
    };
  }

  return undefined;
}

export function provideHover(context: FeatureContext, offset: number): HoverResult | undefined {
  const declared = findSymbolAt(context.semantic, offset);
  const reference = declared === undefined ? findReferenceAt(context.semantic, offset) : undefined;
  if (declared === undefined && reference === undefined) {
    return provideMiniNotationHover(context, offset);
  }
  const symbol =
    declared ??
    (reference === undefined ? undefined : resolveReference(context.semantic, reference));
  const range = declared?.declaration ?? reference?.range;

  if (symbol === undefined || range === undefined) {
    return undefined;
  }

  const sections = [
    `**${symbol.name}** — ${symbolLabel(symbol.kind)}`,
    `Type: \`${formatStrudelType(symbol.type)}\``,
  ];
  const record = metadataRecordForSymbol(context, symbol);
  const documentation = record === undefined ? undefined : recordDocumentation(record);
  if (documentation !== undefined) {
    sections.push(documentation);
  }

  return { range, contents: sections.join('\n\n') };
}
