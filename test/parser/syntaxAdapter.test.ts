import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createSyntaxAdapter,
  type SyntaxKind,
  type SyntaxNode,
  type TextDocumentSnapshot,
} from '../../src/syntax/index.js';
import { positionToOffset } from '../../src/syntax/textCoordinates.js';

function snapshot(text: string, version = 1): TextDocumentSnapshot {
  return { uri: 'file:///pattern.strdl', version, text };
}

function findNodes(node: SyntaxNode, kind: SyntaxKind): SyntaxNode[] {
  const matches = node.kind === kind ? [node] : [];
  for (const child of node.children) {
    matches.push(...findNodes(child, kind));
  }
  return matches;
}

void test('parses Strudel source into stable syntax kinds and ranges', () => {
  const adapter = createSyntaxAdapter();
  const text = 'note("bd sd").fast(2)';
  const document = adapter.parse(snapshot(text));

  assert.equal(document.hasErrors, false);
  assert.equal(document.root.kind, 'sourceFile');
  assert.deepEqual(document.root.range, {
    start: { line: 0, character: 0 },
    end: { line: 0, character: text.length },
    startOffset: 0,
    endOffset: text.length,
  });

  const statement = findNodes(document.root, 'expressionStatement')[0];
  assert.equal(statement.text, text);

  const calls = findNodes(document.root, 'callExpression');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].text, 'note("bd sd").fast(2)');
  assert.equal(calls[0].range.startOffset, 0);
  assert.equal(calls[0].range.endOffset, 21);
  assert.equal(calls[1].text, 'note("bd sd")');
  assert.equal(calls[1].range.endOffset, 13);

  const member = findNodes(document.root, 'memberExpression')[0];
  assert.equal(member.text, 'note("bd sd").fast');

  const args = findNodes(document.root, 'arguments');
  assert.equal(args.length, 2);
  assert.equal(args[0].text, '("bd sd")');
  assert.equal(args[1].text, '(2)');
});

void test('parses variable declarations with chained methods', () => {
  const adapter = createSyntaxAdapter();
  const text = 'const pat = s("bd").fast(2)';
  const document = adapter.parse(snapshot(text));

  assert.equal(document.hasErrors, false);

  const declaration = findNodes(document.root, 'variableDeclaration')[0];
  assert.equal(declaration.text, text);

  const declarator = findNodes(document.root, 'variableDeclarator')[0];
  assert.equal(declarator.text, 'pat = s("bd").fast(2)');

  const member = findNodes(document.root, 'memberExpression')[0];
  assert.equal(member.text, 's("bd").fast');
});

void test('parses dollar-labelled active patterns and recovers from an incomplete label', () => {
  const adapter = createSyntaxAdapter();
  const text = '$: s("bd")';
  const document = adapter.parse(snapshot(text));

  assert.equal(document.hasErrors, false);
  const labeled = findNodes(document.root, 'labeledStatement')[0];
  assert.ok(labeled !== undefined);
  assert.equal(labeled.text, text);
  assert.deepEqual(
    labeled.children.filter((child) => child.named).map((child) => [child.kind, child.text]),
    [
      ['identifier', '$'],
      ['expressionStatement', 's("bd")'],
    ],
  );

  const incomplete = adapter.parse(snapshot('$:'));
  assert.equal(incomplete.hasErrors, true);
});

void test('maps non-ASCII offsets to UTF-16 source positions', () => {
  const adapter = createSyntaxAdapter();
  const text = '// 🎵\nnote("bd sd")';
  const document = adapter.parse(snapshot(text));

  assert.equal(document.hasErrors, false);

  const call = findNodes(document.root, 'callExpression')[0];
  assert.equal(call.range.startOffset, 6);
  assert.deepEqual(call.range.start, { line: 1, character: 0 });

  const identifier = findNodes(document.root, 'identifier')[0];
  assert.equal(identifier.text, 'note');
  assert.equal(identifier.range.startOffset, 6);
  assert.equal(identifier.range.endOffset, 10);
});

void test('maps LSP positions back to clamped UTF-16 offsets', () => {
  const text = '// 🎵\r\nnote("bd sd")';
  assert.equal(positionToOffset(text, { line: 0, character: 3 }), 3);
  assert.equal(positionToOffset(text, { line: 1, character: 0 }), 7);
  assert.equal(positionToOffset(text, { line: 1, character: 4 }), 11);
  assert.equal(positionToOffset(text, { line: 9, character: 100 }), text.length);
  assert.equal(positionToOffset(text, { line: -1, character: -1 }), 0);
});

void test('applies an incremental edit and preserves accurate ranges', () => {
  const adapter = createSyntaxAdapter();
  const initialText = 'note("bd sd")';
  const initial = adapter.parse(snapshot(initialText, 1));
  const insertionOffset = initialText.indexOf(')');
  const updatedText = 'note("bd sd cp")';

  const updated = adapter.update(initial, snapshot(updatedText, 2), [
    {
      startOffset: insertionOffset,
      oldEndOffset: insertionOffset,
      newEndOffset: insertionOffset + 3,
    },
  ]);

  assert.equal(updated.version, 2);
  assert.equal(updated.hasErrors, false);
  assert.equal(updated.text, updatedText);
  assert.equal(updated.root.range.endOffset, updatedText.length);
  assert.equal(findNodes(updated.root, 'string')[0].text, '"bd sd cp"');
  assert.equal(adapter.nodeAt(updated, updatedText.indexOf('cp'))?.kind, 'string');
});

void test('recovers from malformed input and repairs it incrementally', () => {
  const adapter = createSyntaxAdapter();
  const malformedText = 'note("bd sd"';
  const malformed = adapter.parse(snapshot(malformedText, 1));

  assert.equal(malformed.hasErrors, true);
  assert.ok(malformed.root !== undefined);

  const repairedText = 'note("bd sd")';
  const repaired = adapter.update(malformed, snapshot(repairedText, 2), [
    {
      startOffset: malformedText.length,
      oldEndOffset: malformedText.length,
      newEndOffset: repairedText.length,
    },
  ]);

  assert.equal(repaired.hasErrors, false);
  assert.equal(repaired.root.range.endOffset, repairedText.length);
});
