export interface SyntaxPosition {
  /** Zero-based UTF-16 line number. */
  line: number;
  /** Zero-based UTF-16 character offset within the line. */
  character: number;
}

export interface SyntaxRange {
  start: SyntaxPosition;
  end: SyntaxPosition;
  /** UTF-16 code-unit offset from the start of the document. */
  startOffset: number;
  /** UTF-16 code-unit offset from the start of the document. */
  endOffset: number;
}

export type SyntaxKind =
  | 'sourceFile'
  | 'expressionStatement'
  | 'callExpression'
  | 'arguments'
  | 'memberExpression'
  | 'variableDeclaration'
  | 'variableDeclarator'
  | 'assignmentExpression'
  | 'assignmentPattern'
  | 'binaryExpression'
  | 'unaryExpression'
  | 'awaitExpression'
  | 'conditionalExpression'
  | 'arrowFunction'
  | 'functionDeclaration'
  | 'formalParameters'
  | 'block'
  | 'returnStatement'
  | 'labeledStatement'
  | 'tryStatement'
  | 'newExpression'
  | 'subscriptExpression'
  | 'computedPropertyName'
  | 'spreadElement'
  | 'parenthesizedExpression'
  | 'taggedTemplateExpression'
  | 'templateString'
  | 'templateSubstitution'
  | 'array'
  | 'arrayPattern'
  | 'object'
  | 'pair'
  | 'string'
  | 'number'
  | 'identifier'
  | 'comment'
  | 'importDeclaration'
  | 'importSpecifier'
  | 'namedImports'
  | 'exportDeclaration'
  | 'token'
  | 'error'
  | 'unknown';

export interface SyntaxNode {
  /** Identifier that is stable within one syntax document. */
  id: number;
  kind: SyntaxKind;
  named: boolean;
  hasError: boolean;
  isError: boolean;
  isMissing: boolean;
  text: string;
  range: SyntaxRange;
  children: readonly SyntaxNode[];
}

export interface TextDocumentSnapshot {
  uri: string;
  version: number;
  text: string;
}

/**
 * An edit expressed in UTF-16 document offsets. Offsets are taken from the
 * previous snapshot, except `newEndOffset`, which is taken from the next one.
 */
export interface SyntaxEdit {
  startOffset: number;
  oldEndOffset: number;
  newEndOffset: number;
}

export interface SyntaxDocument {
  uri: string;
  version: number;
  text: string;
  hasErrors: boolean;
  root: SyntaxNode;
}

export interface SyntaxAdapter {
  parse(snapshot: TextDocumentSnapshot): SyntaxDocument;
  update(
    previous: SyntaxDocument,
    snapshot: TextDocumentSnapshot,
    edits: readonly SyntaxEdit[],
  ): SyntaxDocument;
  nodeAt(document: SyntaxDocument, offset: number): SyntaxNode | undefined;
}
