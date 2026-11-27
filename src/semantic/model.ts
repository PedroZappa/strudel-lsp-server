import type { MiniNotationAstNode } from '../miniNotation/index.js';
import { offsetsToRange } from '../syntax/textCoordinates.js';
import type { SyntaxNode, SyntaxRange } from '../syntax/index.js';
import type {
  MiniNotationArgument,
  SemanticRange,
  SemanticReferenceKind,
  SemanticScopeKind,
  SemanticSignature,
  SemanticSymbolKind,
  StrudelType,
} from './types.js';

export const GLOBAL_SCOPE_ID = 'scope:global';

export interface MutableSymbol {
  id: string;
  name: string;
  kind: SemanticSymbolKind;
  type: StrudelType;
  declaration?: SemanticRange;
  scopeId: string;
  signature?: SemanticSignature;
}

export interface MutableScope {
  id: string;
  kind: SemanticScopeKind;
  range: SemanticRange;
  parentId?: string;
  symbolIds: string[];
  childIds: string[];
}

export interface MutableReference {
  id: string;
  name: string;
  kind: SemanticReferenceKind;
  range: SemanticRange;
  scopeId: string;
  resolvedSymbolId?: string;
}

export type DeclarationPlanKind = 'variable' | 'function' | 'import' | 'assignment';

export interface DeclarationPlan {
  readonly kind: DeclarationPlanKind;
  readonly name: string;
  readonly symbolId: string;
  readonly statementIndex: number;
  readonly range: SemanticRange;
  readonly node: SyntaxNode;
}

export interface GlobalBinding {
  readonly plan: DeclarationPlan;
  symbol: MutableSymbol;
}

export interface StatementAnalysis {
  readonly key: string;
  readonly sourceText: string;
  readonly sourceRange: SemanticRange;
  readonly scopes: MutableScope[];
  readonly symbols: MutableSymbol[];
  readonly references: MutableReference[];
  readonly miniNotationArguments: MiniNotationArgument[];
}

export interface EngineCache {
  readonly globalSignature: string;
  readonly statementKeys: readonly string[];
  readonly analyses: readonly StatementAnalysis[];
}

export function toSemanticRange(text: string, range: SyntaxRange): SemanticRange {
  return offsetsToRange(text, range.startOffset, range.endOffset);
}

export function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function clampOffset(offset: number, textLength: number): number {
  return Math.max(0, Math.min(offset, textLength));
}

export function shiftRange(range: SemanticRange, text: string, offsetDelta: number): SemanticRange {
  const startOffset = clampOffset(range.startOffset + offsetDelta, text.length);
  const endOffset = clampOffset(range.endOffset + offsetDelta, text.length);
  return offsetsToRange(text, startOffset, endOffset);
}

export function cloneStatementAnalysis(
  analysis: StatementAnalysis,
  sourceText: string,
  sourceRange: SemanticRange,
): StatementAnalysis {
  const offsetDelta = sourceRange.startOffset - analysis.sourceRange.startOffset;
  const mapRange = (range: SemanticRange): SemanticRange =>
    shiftRange(range, sourceText, offsetDelta);
  const mapAstNode = (node: MiniNotationAstNode): MiniNotationAstNode => ({
    kind: node.kind,
    text: node.text,
    range: mapRange(node.range),
    description: node.description,
    children: node.children.map(mapAstNode),
    operator: node.operator,
    targetRange: node.targetRange === undefined ? undefined : mapRange(node.targetRange),
    issueCode: node.issueCode,
    expectedClose: node.expectedClose,
    incomplete: node.incomplete,
    empty: node.empty,
  });

  return {
    key: analysis.key,
    sourceText,
    sourceRange,
    scopes: analysis.scopes.map((scope) => ({
      ...scope,
      range: mapRange(scope.range),
      symbolIds: [...scope.symbolIds],
      childIds: [...scope.childIds],
    })),
    symbols: analysis.symbols.map((symbol) => ({
      ...symbol,
      declaration: symbol.declaration === undefined ? undefined : mapRange(symbol.declaration),
    })),
    references: analysis.references.map((reference) => ({
      ...reference,
      range: mapRange(reference.range),
    })),
    miniNotationArguments: analysis.miniNotationArguments.map((argument) => ({
      ...argument,
      range: mapRange(argument.range),
      analysis:
        argument.analysis === undefined
          ? undefined
          : {
              tokens: argument.analysis.tokens.map((token) => ({
                ...token,
                range: mapRange(token.range),
              })),
              issues: argument.analysis.issues.map((issue) => ({
                ...issue,
                range: mapRange(issue.range),
              })),
              ast: { root: mapAstNode(argument.analysis.ast.root) },
            },
    })),
  };
}

function sameSignature(
  left: SemanticSignature | undefined,
  right: SemanticSignature | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }
  return (
    left.label === right.label &&
    left.documentation === right.documentation &&
    left.source === right.source &&
    left.parameters.length === right.parameters.length &&
    left.parameters.every((parameter, index) => {
      const other = right.parameters[index];
      return (
        other?.label === parameter.label &&
        other.documentation === parameter.documentation &&
        other.optional === parameter.optional &&
        other.rest === parameter.rest
      );
    })
  );
}

export function sameType(left: StrudelType, right: StrudelType): boolean {
  if (left.kind !== right.kind || !sameSignature(left.signature, right.signature)) {
    return false;
  }
  if (left.returnType === undefined || right.returnType === undefined) {
    return left.returnType === right.returnType;
  }
  return sameType(left.returnType, right.returnType);
}

export function combineReturnTypes(types: readonly StrudelType[]): StrudelType {
  const first = types[0];
  if (first === undefined) {
    return UNKNOWN_FALLBACK;
  }

  for (const type of types) {
    if (!sameType(first, type)) {
      return UNKNOWN_FALLBACK;
    }
  }
  return first;
}

// Imported as a type above so this module never needs a runtime dependency on
// the factory module; the fallback is structurally identical.
const UNKNOWN_FALLBACK: StrudelType = { kind: 'Unknown' };
