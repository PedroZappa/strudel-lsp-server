import type { LanguageMetadataRecord, MetadataParameter } from '../languageDatabase/index.js';
import {
  findReferenceAt,
  resolveReference,
  type SemanticSignature,
  type SemanticSymbol,
} from '../semantic/index.js';
import type { SyntaxNode } from '../syntax/index.js';

import { recordDocumentation } from './metadata.js';
import type {
  FeatureContext,
  SignatureHelpResult,
  SignatureHelpSignature,
  SignatureParameter,
} from './types.js';

function namedChildren(node: SyntaxNode): readonly SyntaxNode[] {
  return node.children.filter((child) => child.named);
}

function collectCalls(node: SyntaxNode, offset: number, found: SyntaxNode[]): void {
  if (
    node.kind === 'callExpression' &&
    node.range.startOffset <= offset &&
    offset <= node.range.endOffset
  ) {
    found.push(node);
  }
  for (const child of node.children) {
    collectCalls(child, offset, found);
  }
}

function argumentsOf(call: SyntaxNode): SyntaxNode | undefined {
  return namedChildren(call).find((child) => child.kind === 'arguments');
}

function calleeName(call: SyntaxNode): string | undefined {
  const callee = namedChildren(call).find((child) => child.kind !== 'arguments');
  if (callee === undefined) {
    return undefined;
  }
  if (callee.kind === 'identifier') {
    return callee.text;
  }
  if (callee.kind === 'memberExpression') {
    const named = namedChildren(callee);
    return named.find((child, index) => child.kind === 'identifier' && index > 0)?.text;
  }
  return undefined;
}

function calleeNode(call: SyntaxNode): SyntaxNode | undefined {
  return namedChildren(call).find((child) => child.kind !== 'arguments');
}

function calleeTarget(call: SyntaxNode): SyntaxNode | undefined {
  const callee = calleeNode(call);
  if (callee === undefined) {
    return undefined;
  }
  if (callee.kind === 'identifier') {
    return callee;
  }
  if (callee.kind === 'memberExpression') {
    return namedChildren(callee).find((child, index) => child.kind === 'identifier' && index > 0);
  }
  return undefined;
}

function activeArgumentIndex(args: SyntaxNode, offset: number): number {
  const arguments_ = namedChildren(args);
  for (const [index, argument] of arguments_.entries()) {
    if (offset <= argument.range.endOffset) {
      return index;
    }
  }
  return arguments_.length;
}

function symbolForCallee(context: FeatureContext, call: SyntaxNode): SemanticSymbol | undefined {
  const target = calleeTarget(call);
  if (target === undefined) {
    return undefined;
  }
  const reference = findReferenceAt(context.semantic, target.range.startOffset);
  return reference === undefined ? undefined : resolveReference(context.semantic, reference);
}

function isCatalogSymbol(symbol: SemanticSymbol): boolean {
  return ['builtin', 'method', 'sample'].includes(symbol.kind);
}

function userSignature(symbol: SemanticSymbol | undefined): SemanticSignature | undefined {
  if (
    symbol === undefined ||
    isCatalogSymbol(symbol) ||
    !['function', 'variable'].includes(symbol.kind)
  ) {
    return undefined;
  }
  return symbol.signature ?? symbol.type.signature;
}

function formatParameter(parameter: MetadataParameter): string {
  const name = parameter.name ?? 'arg';
  return parameter.types.length === 0 ? name : `${name}: ${parameter.types.join(' | ')}`;
}

function toSignature(
  label: string,
  documentation: string | undefined,
  parameters: readonly {
    readonly label: string;
    readonly documentation?: string;
    readonly optional?: boolean;
    readonly rest?: boolean;
  }[],
): SignatureHelpSignature {
  const mapped: SignatureParameter[] = [];
  let cursor = label.indexOf('(') + 1;

  for (const parameter of parameters) {
    mapped.push({
      label: parameter.label,
      labelRange: [cursor, cursor + parameter.label.length],
      documentation: parameter.documentation,
      optional: parameter.optional,
      rest: parameter.rest,
    });
    cursor += parameter.label.length + 2;
  }

  return { label, documentation, parameters: mapped };
}

function signatureFromSemantic(signature: SemanticSignature): SignatureHelpSignature {
  return toSignature(signature.label, signature.documentation, signature.parameters);
}

function signatureFromCatalog(
  name: string,
  signature: SemanticSignature,
  record: LanguageMetadataRecord,
): SignatureHelpSignature {
  const label = signature.label.replace(/^[^(\s]+/, name);
  const parameters = signature.parameters.map((parameter, index) => ({
    ...parameter,
    documentation: parameter.documentation ?? record.parameters[index]?.description,
  }));
  return toSignature(label, signature.documentation ?? recordDocumentation(record), parameters);
}

function signatureFromRecord(name: string, record: LanguageMetadataRecord): SignatureHelpSignature {
  const parameters = record.parameters.map((parameter) => ({
    label: formatParameter(parameter),
    documentation: parameter.description,
  }));
  return toSignature(
    `${name}(${parameters.map((parameter) => parameter.label).join(', ')})`,
    recordDocumentation(record),
    parameters,
  );
}

function acceptsArgumentCount(signature: SignatureHelpSignature, count: number): boolean {
  const total = signature.parameters.length;
  if (signature.parameters[total - 1]?.rest === true) {
    return count >= total - 1;
  }
  const required = signature.parameters.filter((parameter) => parameter.optional !== true).length;
  return count >= required && count <= total;
}

function signatureScore(signature: SignatureHelpSignature, count: number): number {
  if (!acceptsArgumentCount(signature, count)) {
    return -1;
  }
  const total = signature.parameters.length;
  if (signature.parameters[total - 1]?.rest === true) {
    return 0;
  }
  const required = signature.parameters.filter((parameter) => parameter.optional !== true).length;
  return required * 10 + (total === count ? 5 : 0);
}

function selectSignature(signatures: readonly SignatureHelpSignature[], count: number): number {
  let best = 0;
  let bestScore = -1;
  signatures.forEach((signature, index) => {
    const score = signatureScore(signature, count);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function resolveActiveParameter(
  activeParameter: number,
  signature: SignatureHelpSignature,
): number {
  return Math.min(activeParameter, Math.max(0, signature.parameters.length - 1));
}

export function provideSignatureHelp(
  context: FeatureContext,
  offset: number,
): SignatureHelpResult | undefined {
  // Editors request signature help immediately after a typed `, `, while
  // Tree-sitter may end the call range at the comma. Move only over whitespace
  // directly before the cursor for call discovery; the real offset still
  // determines the active parameter.
  let effectiveOffset = Math.min(offset, context.syntax.root.range.endOffset);
  while (effectiveOffset > 0 && /\s/.test(context.text[effectiveOffset - 1] ?? '')) {
    effectiveOffset -= 1;
  }
  const calls: SyntaxNode[] = [];
  collectCalls(context.syntax.root, effectiveOffset, calls);

  for (const call of calls.reverse()) {
    const args = argumentsOf(call);
    if (
      args === undefined ||
      effectiveOffset < args.range.startOffset ||
      effectiveOffset > args.range.endOffset
    ) {
      continue;
    }

    const name = calleeName(call);
    if (name === undefined) {
      continue;
    }

    const activeParameter = activeArgumentIndex(args, offset);
    const argumentCount = namedChildren(args).length;
    const calleeSymbol = symbolForCallee(context, call);
    const user = userSignature(calleeSymbol);
    if (calleeSymbol !== undefined && !isCatalogSymbol(calleeSymbol) && user === undefined) {
      continue;
    }
    if (user !== undefined) {
      const signatures = [signatureFromSemantic(user)];
      return {
        signatures,
        activeSignature: 0,
        activeParameter: resolveActiveParameter(activeParameter, signatures[0]),
        range: call.range,
      };
    }

    const record =
      calleeNode(call)?.kind === 'identifier'
        ? context.database.getGlobalRecord(name)
        : context.database.getMethodRecord(name);
    if (record === undefined) {
      continue;
    }

    const signatures =
      record.signatures === undefined || record.signatures.length === 0
        ? [signatureFromRecord(name, record)]
        : record.signatures.map((signature) => signatureFromCatalog(name, signature, record));
    if (
      signatures.length === 0 ||
      signatures.every((signature) => signature.parameters.length === 0)
    ) {
      continue;
    }
    const activeSignature = selectSignature(signatures, argumentCount);
    const selected = signatures[activeSignature];
    return {
      signatures,
      activeSignature,
      activeParameter: resolveActiveParameter(activeParameter, selected),
      range: call.range,
    };
  }

  return undefined;
}
