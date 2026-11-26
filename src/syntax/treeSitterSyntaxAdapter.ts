import { createRequire } from 'node:module';

import { normalizeKind } from './kinds.js';
import { offsetToPosition, offsetsToRange } from './textCoordinates.js';
import type {
  SyntaxAdapter,
  SyntaxDocument,
  SyntaxEdit,
  SyntaxNode,
  TextDocumentSnapshot,
} from './types.js';

interface NativePoint {
  row: number;
  column: number;
}

interface NativeNode {
  id: number;
  type: string;
  isNamed: boolean;
  isError: boolean;
  isMissing: boolean;
  hasError: boolean;
  text: string;
  startIndex: number;
  endIndex: number;
  children: NativeNode[];
}

interface NativeEdit {
  startIndex: number;
  oldEndIndex: number;
  newEndIndex: number;
  startPosition: NativePoint;
  oldEndPosition: NativePoint;
  newEndPosition: NativePoint;
}

interface NativeTree {
  rootNode: NativeNode;
  edit(edit: NativeEdit): void;
}

interface NativeParser {
  reset(): void;
  setLanguage(language: unknown): void;
  parse(text: string, previousTree?: NativeTree | null): NativeTree;
}

type NativeParserConstructor = new () => NativeParser;

function toNativePoint(position: { line: number; character: number }): NativePoint {
  return { row: position.line, column: position.character };
}

const runtimeRequire = createRequire(import.meta.url);
const Parser = runtimeRequire('tree-sitter') as NativeParserConstructor;
const strudelLanguage: unknown = runtimeRequire('tree-sitter-strudel');

class TreeSitterSyntaxAdapter implements SyntaxAdapter {
  private readonly parser: NativeParser;
  private readonly trees = new WeakMap<SyntaxDocument, NativeTree>();

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(strudelLanguage);
  }

  parse(snapshot: TextDocumentSnapshot): SyntaxDocument {
    this.parser.reset();
    return this.createDocument(snapshot, this.parser.parse(snapshot.text));
  }

  update(
    previous: SyntaxDocument,
    snapshot: TextDocumentSnapshot,
    edits: readonly SyntaxEdit[],
  ): SyntaxDocument {
    const previousTree = this.trees.get(previous);
    if (previousTree === undefined) {
      return this.parse(snapshot);
    }

    if (edits.length === 0 && previous.text !== snapshot.text) {
      return this.parse(snapshot);
    }

    for (const edit of edits) {
      previousTree.edit(this.toNativeEdit(edit, previous, snapshot));
    }

    return this.createDocument(snapshot, this.parser.parse(snapshot.text, previousTree));
  }

  nodeAt(document: SyntaxDocument, offset: number): SyntaxNode | undefined {
    const target = Math.max(0, Math.min(offset, document.root.range.endOffset));
    return this.findDeepest(document.root, target);
  }

  private createDocument(snapshot: TextDocumentSnapshot, tree: NativeTree): SyntaxDocument {
    const document: SyntaxDocument = {
      uri: snapshot.uri,
      version: snapshot.version,
      hasErrors: tree.rootNode.hasError,
      root: this.toSyntaxNode(tree.rootNode, snapshot.text),
      text: snapshot.text,
    };
    this.trees.set(document, tree);
    return document;
  }

  private toSyntaxNode(node: NativeNode, text: string): SyntaxNode {
    return {
      id: node.id,
      kind: normalizeKind(node.type, node.isNamed, node.isError),
      named: node.isNamed,
      hasError: node.hasError,
      isError: node.isError,
      isMissing: node.isMissing,
      text: node.text,
      range: offsetsToRange(text, node.startIndex, node.endIndex),
      children: node.children.map((child) => this.toSyntaxNode(child, text)),
    };
  }

  private toNativeEdit(
    edit: SyntaxEdit,
    previous: SyntaxDocument,
    snapshot: TextDocumentSnapshot,
  ): NativeEdit {
    return {
      startIndex: edit.startOffset,
      oldEndIndex: edit.oldEndOffset,
      newEndIndex: edit.newEndOffset,
      startPosition: toNativePoint(offsetToPosition(previous.text, edit.startOffset)),
      oldEndPosition: toNativePoint(offsetToPosition(previous.text, edit.oldEndOffset)),
      newEndPosition: toNativePoint(offsetToPosition(snapshot.text, edit.newEndOffset)),
    };
  }

  private findDeepest(node: SyntaxNode, offset: number): SyntaxNode | undefined {
    if (offset < node.range.startOffset || offset > node.range.endOffset) {
      return undefined;
    }

    for (const child of node.children) {
      const found = this.findDeepest(child, offset);
      if (found !== undefined) {
        return found;
      }
    }

    return node;
  }
}

export function createSyntaxAdapter(): SyntaxAdapter {
  return new TreeSitterSyntaxAdapter();
}
