import type { LanguageMetadataRecord, MetadataParameter } from '../languageDatabase/index.js';
import { findReferenceAt, resolveReference } from '../semantic/index.js';
import type { SyntaxNode } from '../syntax/index.js';

import { recordDocumentation } from './metadata.js';
import type { FeatureContext, SignatureHelpResult, SignatureParameter } from './types.js';

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

function activeArgumentIndex(args: SyntaxNode, offset: number): number {
  const arguments_ = namedChildren(args);
  for (const [index, argument] of arguments_.entries()) {
    if (offset <= argument.range.endOffset) {
      return index;
    }
  }
  return arguments_.length;
}

function hasUserDefinition(context: FeatureContext, callee: SyntaxNode): boolean {
  if (callee.kind !== 'identifier' && callee.kind !== 'memberExpression') {
    return false;
  }
  const target =
    callee.kind === 'identifier'
      ? callee
      : namedChildren(callee).find((child, index) => child.kind === 'identifier' && index > 0);
  if (target === undefined) {
    return false;
  }

  const reference = findReferenceAt(context.semantic, target.range.startOffset);
  const symbol =
    reference === undefined ? undefined : resolveReference(context.semantic, reference);
  if (symbol === undefined) {
    return false;
  }
  return !['builtin', 'method', 'sample'].includes(symbol.kind);
}

function formatParameter(parameter: MetadataParameter): string {
  const name = parameter.name ?? 'arg';
  return parameter.types.length === 0 ? name : `${name}: ${parameter.types.join(' | ')}`;
}

function signatureFromRecord(
  name: string,
  record: LanguageMetadataRecord,
  activeParameter: number,
  range: SignatureHelpResult['range'],
): SignatureHelpResult {
  const parameters: SignatureParameter[] = [];
  let cursor = name.length + 1;

  for (const parameter of record.parameters) {
    const label = formatParameter(parameter);
    parameters.push({
      label,
      labelRange: [cursor, cursor + label.length],
      documentation: parameter.description,
    });
    cursor += label.length + 2;
  }

  const label = `${name}(${parameters.map((parameter) => parameter.label).join(', ')})`;
  return {
    label,
    documentation: recordDocumentation(record),
    parameters,
    activeParameter: parameters.length === 0 ? 0 : Math.min(activeParameter, parameters.length - 1),
    range,
  };
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

    const callee = namedChildren(call).find((child) => child.kind !== 'arguments');
    if (callee === undefined || hasUserDefinition(context, callee)) {
      continue;
    }

    const name = calleeName(call);
    if (name === undefined) {
      continue;
    }

    const record =
      callee.kind === 'identifier'
        ? context.database.getGlobalRecord(name)
        : context.database.getMethodRecord(name);
    if (record === undefined || record.parameters.length === 0) {
      continue;
    }

    return signatureFromRecord(name, record, activeArgumentIndex(args, offset), call.range);
  }

  return undefined;
}
