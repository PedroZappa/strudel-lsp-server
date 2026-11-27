import assert from 'node:assert/strict';

import { test } from 'node:test';

import { analyzeMiniNotation } from '../../src/miniNotation/index.js';

function analyze(source: string) {
  const text = `"${source}"`;
  return analyzeMiniNotation(text, 1, text.length - 1);
}

void test('tokenizes documented 1.2.6 operators with absolute ranges', () => {
  const analysis = analyze('bd sd [hh?0.2]*2, ~');
  assert.deepEqual(
    analysis.tokens
      .filter((token) => token.kind !== 'whitespace')
      .map((token) => [token.kind, token.text]),
    [
      ['step', 'bd'],
      ['step', 'sd'],
      ['subsequence', '['],
      ['step', 'hh'],
      ['degrade', '?'],
      ['number', '0.2'],
      ['subsequence', ']'],
      ['repeat', '*'],
      ['number', '2'],
      ['parallel', ','],
      ['rest', '~'],
    ],
  );
  assert.equal(analysis.tokens[0]?.range.startOffset, 1);
  assert.equal(analysis.tokens[0]?.range.endOffset, 3);
  assert.deepEqual(analysis.issues, []);
});

void test('describes replication, list notation and alternation according to pinned semantics', () => {
  const analysis = analyze('a!3 <bd hh> bd:0:0.3');
  const replicate = analysis.tokens.find((token) => token.kind === 'replicate');
  assert.match(replicate?.description ?? '', /replication/i);
  assert.match(replicate?.description ?? '', /not velocity/i);
  const slice = analysis.tokens.find((token) => token.kind === 'slice');
  assert.match(slice?.description ?? '', /sample parameters/i);
  const alternation = analysis.tokens.find((token) => token.kind === 'alternation');
  assert.match(alternation?.description ?? '', /one alternative per cycle/i);
});

void test('reports only structural faults that the grammar rejects', () => {
  assert.equal(analyze('[]').issues[0]?.code, 'empty-group');
  assert.equal(analyze('a)').issues[0]?.code, 'unmatched-close');
  assert.equal(analyze('[bd>').issues[0]?.code, 'mismatched-close');
  assert.equal(analyze('a,,b').issues[0]?.code, 'empty-step');
  assert.deepEqual(analyze('bd sd [~ bd] sd,hh*6').issues, []);
});

void test('suppresses incomplete live-coding states', () => {
  for (const source of ['bd sd [', 'bd*', '<bd sd', 'a,', 'a@', 'a!', 'a?', 'a(3,8,)']) {
    assert.deepEqual(analyze(source).issues, [], source);
  }
});

void test('unsupported characters advance without speculative diagnostics', () => {
  for (const source of ['a+b', 'a.b', 'a&b', ';']) {
    const analysis = analyze(source);
    assert.equal(analysis.tokens.length > 0, true, source);
    assert.equal(
      analysis.tokens.every((token) => token.range.startOffset < token.range.endOffset),
      true,
      source,
    );
    assert.deepEqual(analysis.issues, [], source);
  }
});
