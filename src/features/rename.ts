import type { SemanticSymbolKind } from '../semantic/index.js';

import { findSymbolAtOffset, provideReferences } from './navigation.js';
import type {
  FeatureContext,
  PrepareRenameResult,
  RenameResult,
  SymbolLookupResult,
} from './types.js';

const RENAMABLE_KINDS: ReadonlySet<SemanticSymbolKind> = new Set([
  'variable',
  'function',
  'parameter',
  'import',
]);

// ECMAScript reserved words plus strict-mode reserved words. Strudel source is
// analysed as ESM, so no new name in this set can be used as a binding.
const RESERVED_NAMES: ReadonlySet<string> = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

const IDENTIFIER_PATTERN = /^[$_\p{ID_Start}][$\p{ID_Continue}]*$/u;

function isValidIdentifier(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name) && !RESERVED_NAMES.has(name);
}

function renamableSymbol(context: FeatureContext, offset: number): SymbolLookupResult | undefined {
  // Incomplete live-coding input can leave stale references, so rename is
  // withheld until the syntax tree is clean.
  if (context.syntax.hasErrors) {
    return undefined;
  }

  const found = findSymbolAtOffset(context, offset);
  if (found === undefined) {
    return undefined;
  }
  if (found.symbol.declaration === undefined || !RENAMABLE_KINDS.has(found.symbol.kind)) {
    return undefined;
  }
  return found;
}

export function prepareRename(
  context: FeatureContext,
  offset: number,
): PrepareRenameResult | undefined {
  const found = renamableSymbol(context, offset);
  return found === undefined ? undefined : { range: found.range, placeholder: found.symbol.name };
}

export function provideRename(
  context: FeatureContext,
  offset: number,
  newName: string,
): RenameResult | undefined {
  const found = renamableSymbol(context, offset);
  if (found === undefined || newName === found.symbol.name || !isValidIdentifier(newName)) {
    return undefined;
  }

  const ranges = provideReferences(context, offset, true).map((reference) => reference.range);
  if (
    ranges.length === 0 ||
    ranges.some(
      (range) => context.text.slice(range.startOffset, range.endOffset) !== found.symbol.name,
    )
  ) {
    return undefined;
  }

  return { edits: ranges.map((range) => ({ range, newText: newName })) };
}
