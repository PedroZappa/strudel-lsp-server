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

export function provideHover(context: FeatureContext, offset: number): HoverResult | undefined {
  const declared = findSymbolAt(context.semantic, offset);
  const reference = declared === undefined ? findReferenceAt(context.semantic, offset) : undefined;
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
