import assert from 'node:assert/strict';

import { test } from 'node:test';

import { analyzeMiniNotation, miniNotationAstNodes } from '../../src/miniNotation/index.js';

function analyze(source: string) {
  const text = `"${source}"`;
  return analyzeMiniNotation(text, 1, text.length - 1);
}

function kinds(nodes: readonly { readonly kind: string }[]): readonly string[] {
  return nodes.map((node) => node.kind);
}

void test('builds nested structure from pinned 1.2.6 constructs', () => {
  const analysis = analyze('bd sd [hh?0.2]*2, ~');
  assert.deepEqual(analysis.issues, []);
  assert.equal(analysis.ast.root.kind, 'sequence');
  assert.equal(analysis.ast.root.text, 'bd sd [hh?0.2]*2, ~');
  assert.deepEqual(kinds(analysis.ast.root.children), [
    'step',
    'step',
    'subsequence',
    'operator',
    'number',
    'operator',
    'rest',
  ]);

  const group = analysis.ast.root.children[2];
  assert.equal(group?.text, '[hh?0.2]');
  assert.equal(group?.range.startOffset, 7);
  assert.equal(group?.range.endOffset, 15);
  assert.deepEqual(kinds(group?.children ?? []), ['step', 'operator', 'number']);

  const degrade = group?.children[1];
  assert.equal(degrade?.operator, 'degrade');
  assert.deepEqual([degrade?.targetRange?.startOffset, degrade?.targetRange?.endOffset], [8, 10]);

  const repeat = analysis.ast.root.children[3];
  assert.equal(repeat?.operator, 'repeat');
  assert.deepEqual([repeat?.targetRange?.startOffset, repeat?.targetRange?.endOffset], [7, 15]);
  assert.equal(miniNotationAstNodes(analysis.ast.root).length, 11);
});

void test('recovers mismatched closers without cascading diagnostics', () => {
  const analysis = analyze('[bd sd) | ,');
  assert.equal(analysis.issues.length, 1);
  assert.equal(analysis.issues[0]?.code, 'mismatched-close');
  assert.equal(analysis.issues[0]?.expectedClose, ']');

  const group = analysis.ast.root.children[0];
  assert.equal(group?.kind, 'subsequence');
  assert.equal(group?.incomplete, true);
  assert.deepEqual(kinds(group?.children ?? []), ['step', 'step', 'error', 'operator', 'operator']);
  assert.equal(group?.children[2]?.issueCode, 'mismatched-close');
  assert.equal(group?.children[2]?.range.startOffset, 7);
  assert.equal(group?.children[2]?.range.endOffset, 8);
  assert.deepEqual(kinds(analysis.ast.root.children), ['subsequence']);
  assert.equal(group?.children[4]?.incomplete, true);

  for (const node of miniNotationAstNodes(analysis.ast.root)) {
    assert.ok(node.range.startOffset >= 1 && node.range.endOffset <= 12);
  }
});

void test('marks unclosed groups and empty groups structurally', () => {
  const incomplete = analyze('bd sd [');
  assert.deepEqual(incomplete.issues, []);
  const openGroup = incomplete.ast.root.children[2];
  assert.equal(openGroup?.kind, 'subsequence');
  assert.equal(openGroup?.incomplete, true);
  assert.equal(openGroup?.text, '[');

  const empty = analyze('[]');
  assert.equal(empty.issues[0]?.code, 'empty-group');
  assert.equal(empty.ast.root.children[0]?.empty, true);
  assert.equal(empty.ast.root.children[0]?.text, '[]');
});

void test('models documented operators without assigning pitch or sample semantics', () => {
  const analysis = analyze('a@3 !4 .. 5 . b (3,8,2) ^');
  const operators = miniNotationAstNodes(analysis.ast.root)
    .filter((node) => node.kind === 'operator')
    .map((node) => node.operator);

  assert.deepEqual(operators, [
    'weight',
    'replicate',
    'range',
    'feet',
    'parallel',
    'parallel',
    'stepMarker',
  ]);
  assert.ok(
    miniNotationAstNodes(analysis.ast.root).every(
      (node) => node.kind !== 'error' && node.kind !== 'unknown',
    ),
  );
  const euclid = analysis.ast.root.children.find((node) => node.kind === 'euclid');
  assert.equal(euclid?.text, '(3,8,2)');
});
