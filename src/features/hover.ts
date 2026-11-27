import { findReferenceAt, findSymbolAt, resolveReference } from '../semantic/index.js';

import { formatStrudelType, metadataRecordForSymbol, recordDocumentation } from './metadata.js';
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

    const token = analysis.tokens.find(
      (candidate) =>
        candidate.kind !== 'whitespace' &&
        offset >= candidate.range.startOffset &&
        offset < candidate.range.endOffset,
    );
    if (token === undefined) {
      continue;
    }

    return {
      range: token.range,
      contents: [
        `\`${token.text}\` — mini notation ${token.kind}`,
        token.description,
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
