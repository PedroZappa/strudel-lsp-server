import { dirname, isAbsolute, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SemanticRange } from '../semantic/index.js';
import type { SyntaxNode } from '../syntax/index.js';
import { offsetsToRange } from '../syntax/textCoordinates.js';

import type { CompletionCandidate, FeatureContext } from './types.js';

export interface ImportPathCompletionTarget {
  /** Verbatim text between the opening quote and the request offset. */
  readonly prefix: string;
  readonly contentStartOffset: number;
}

function clampOffset(text: string, offset: number): number {
  return Math.max(0, Math.min(offset, text.length));
}

function contains(range: SemanticRange, offset: number): boolean {
  return offset >= range.startOffset && offset <= range.endOffset;
}

function descendants(node: SyntaxNode): SyntaxNode[] {
  const nodes: SyntaxNode[] = [node];
  for (const child of node.children) {
    nodes.push(...descendants(child));
  }
  return nodes;
}

function isSafeText(value: string): boolean {
  return (
    value.length > 0 && !value.includes('\0') && !value.includes('\\') && !/["'\r\n]/.test(value)
  );
}

function isSafePrefix(prefix: string): boolean {
  if (prefix === '') {
    return true;
  }
  if (!isSafeText(prefix) || (!prefix.startsWith('./') && !prefix.startsWith('../'))) {
    return false;
  }
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  if (trimmed === '.' || trimmed === '..') {
    return true;
  }
  const segments = trimmed
    .replace(/^(?:\.\.\/)+/, '')
    .replace(/^\.\//, '')
    .split('/');
  return (
    segments.length > 0 &&
    segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function leadingParentCount(specifier: string): number {
  let count = 0;
  while (specifier.startsWith('../')) {
    count += 1;
    specifier = specifier.slice(3);
  }
  return count;
}

function relativeSpecifier(fromUri: string, targetUri: string): string | undefined {
  if (
    !fromUri.startsWith('file:') ||
    !targetUri.startsWith('file:') ||
    !targetUri.endsWith('.strudel')
  ) {
    return undefined;
  }

  let fromPath: string;
  let targetPath: string;
  try {
    fromPath = fileURLToPath(fromUri);
    targetPath = fileURLToPath(targetUri);
  } catch {
    return undefined;
  }

  const computed = relative(dirname(fromPath), targetPath);
  if (computed === '' || isAbsolute(computed)) {
    return undefined;
  }
  const posixPath = computed.split(sep).join('/');
  const segments = posixPath.split('/');
  if (segments.some((segment) => segment === '' || segment === '.')) {
    return undefined;
  }
  const firstNonParent = segments.findIndex((segment) => segment !== '..');
  if (
    firstNonParent < 0 ||
    firstNonParent >= segments.length ||
    segments.slice(firstNonParent).some((segment) => segment === '..')
  ) {
    return undefined;
  }

  const specifier = posixPath.startsWith('../') ? posixPath : `./${posixPath}`;
  return isSafeText(specifier) ? specifier : undefined;
}

/**
 * Finds an explicit import declaration whose string specifier contains the
 * request offset. It returns only verbatim source text and offsets; filesystem
 * access stays in the transport layer.
 */
export function findImportPathCompletion(
  context: FeatureContext,
  offset: number,
): ImportPathCompletionTarget | undefined {
  const cursor = clampOffset(context.text, offset);
  for (const declaration of descendants(context.syntax.root)) {
    if (declaration.kind !== 'importDeclaration' || !contains(declaration.range, cursor)) {
      continue;
    }
    for (const candidate of descendants(declaration)) {
      if (candidate.kind !== 'string' || !contains(candidate.range, cursor)) {
        continue;
      }
      const quote = context.text[candidate.range.startOffset];
      if (quote !== '"' && quote !== "'") {
        continue;
      }
      const contentStartOffset = candidate.range.startOffset + 1;
      let contentEndOffset = candidate.range.endOffset;
      if (context.text[contentEndOffset - 1] === quote) {
        contentEndOffset -= 1;
      }
      if (cursor < contentStartOffset || cursor > contentEndOffset) {
        continue;
      }
      return {
        prefix: context.text.slice(contentStartOffset, cursor),
        contentStartOffset,
      };
    }
  }
  return undefined;
}

/**
 * Converts transport-supplied workspace file URIs into relative specifiers for
 * the current document. Candidate selection is pure: the bounded scan that
 * produced the URIs owns all symlink, traversal, size, depth and readability
 * guards, and no index or watcher is retained between requests.
 */
export function provideImportPathCompletion(
  context: FeatureContext,
  target: ImportPathCompletionTarget,
  workspaceFileUris: readonly string[],
): readonly CompletionCandidate[] {
  if (!isSafePrefix(target.prefix)) {
    return [];
  }

  const labels = new Set<string>();
  for (const uri of workspaceFileUris) {
    const specifier = relativeSpecifier(context.uri, uri);
    if (specifier?.startsWith(target.prefix) === true) {
      labels.add(specifier);
    }
  }

  const replacementRange: SemanticRange = offsetsToRange(
    context.text,
    target.contentStartOffset,
    target.contentStartOffset + target.prefix.length,
  );
  return [...labels]
    .sort(
      (left, right) =>
        leadingParentCount(left) - leadingParentCount(right) || compareStrings(left, right),
    )
    .map((label) => ({
      label,
      kind: 'file',
      detail: '.strudel file',
      replacementRange,
    }));
}
