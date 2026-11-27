import type { MiniNotationTokenKind } from '../miniNotation/index.js';
import type { SemanticSymbol, SemanticSymbolKind } from '../semantic/index.js';

import type {
  FeatureContext,
  SemanticTokenModifier,
  SemanticTokenResult,
  SemanticTokenType,
} from './types.js';

interface SymbolClassification {
  readonly type: SemanticTokenType;
  readonly library: boolean;
}

function classifySymbol(kind: SemanticSymbolKind): SymbolClassification | undefined {
  switch (kind) {
    case 'variable':
    case 'import':
      return { type: 'variable', library: false };
    case 'function':
      return { type: 'function', library: false };
    case 'parameter':
      return { type: 'parameter', library: false };
    case 'builtin':
      return { type: 'function', library: true };
    case 'method':
      return { type: 'method', library: true };
    case 'sample':
      return { type: 'variable', library: true };
    default:
      return undefined;
  }
}

function miniNotationType(kind: MiniNotationTokenKind): SemanticTokenType | undefined {
  switch (kind) {
    case 'number':
      return 'number';
    case 'rest':
    case 'repeat':
    case 'slow':
    case 'weight':
    case 'replicate':
    case 'degrade':
    case 'parallel':
    case 'choice':
    case 'slice':
    case 'range':
    case 'feet':
    case 'subsequence':
    case 'alternation':
    case 'polymeter':
    case 'euclid':
    case 'stepMarker':
      return 'operator';
    default:
      return undefined;
  }
}

/**
 * Emits a token only when semantic resolution or the pinned mini-notation
 * lexer supplies a verified classification. Unknown identifiers, syntax
 * errors and ordinary step text are left to the client's syntax highlighting.
 */
export function provideSemanticTokens(context: FeatureContext): readonly SemanticTokenResult[] {
  const { semantic } = context;
  const tokens = new Map<string, SemanticTokenResult>();

  const add = (
    range: SemanticTokenResult['range'],
    expectedText: string,
    type: SemanticTokenType,
    modifiers: readonly SemanticTokenModifier[],
  ): void => {
    const isSingleLine = range.start.line === range.end.line;
    const length = range.end.character - range.start.character;
    if (
      !isSingleLine ||
      length <= 0 ||
      context.text.slice(range.startOffset, range.endOffset) !== expectedText
    ) {
      return;
    }

    const key = `${range.startOffset}:${range.endOffset}`;
    if (!tokens.has(key)) {
      tokens.set(key, { range, type, modifiers });
    }
  };

  const addSymbol = (
    symbol: SemanticSymbol | undefined,
    range: SemanticTokenResult['range'],
    expectedText: string,
    declaration: boolean,
  ): void => {
    if (symbol === undefined) {
      return;
    }
    const classification = classifySymbol(symbol.kind);
    if (classification === undefined) {
      return;
    }
    const modifiers: SemanticTokenModifier[] = [];
    if (declaration) {
      modifiers.push('declaration');
    }
    if (classification.library) {
      modifiers.push('defaultLibrary');
    }
    add(range, expectedText, classification.type, modifiers);
  };

  for (const symbol of semantic.symbols.values()) {
    if (symbol.declaration !== undefined) {
      addSymbol(symbol, symbol.declaration, symbol.name, true);
    }
  }

  for (const reference of semantic.references) {
    if (reference.resolvedSymbolId === undefined) {
      continue;
    }
    addSymbol(
      semantic.symbols.get(reference.resolvedSymbolId),
      reference.range,
      reference.name,
      false,
    );
  }

  for (const argument of semantic.miniNotationArguments) {
    for (const token of argument.analysis?.tokens ?? []) {
      const type = miniNotationType(token.kind);
      if (type !== undefined) {
        add(token.range, token.text, type, []);
      }
    }
  }

  return [...tokens.values()].sort(
    (left, right) => left.range.startOffset - right.range.startOffset,
  );
}
