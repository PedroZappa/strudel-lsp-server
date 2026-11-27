import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideSemanticTokens } from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

function tokenSummary(text: string): (string | readonly string[])[] {
  const { context } = createFeatureHarness(text);
  return provideSemanticTokens(context).map((token) => [
    text.slice(token.range.startOffset, token.range.endOffset),
    token.type,
    token.modifiers.join('+'),
  ]);
}

void test('semantic tokens classify only resolved symbols', () => {
  const text = 'const pat = s("bd sd").fast(2)\npat\nunknownFn()';
  assert.deepEqual(tokenSummary(text), [
    ['pat', 'variable', 'declaration'],
    ['s', 'function', 'defaultLibrary'],
    ['fast', 'method', 'defaultLibrary'],
    ['pat', 'variable', ''],
  ]);
});

void test('semantic tokens cover verified mini-notation numbers and operators', () => {
  assert.deepEqual(tokenSummary('s("bd*3 [sd|hh]")'), [
    ['s', 'function', 'defaultLibrary'],
    ['*', 'operator', ''],
    ['3', 'number', ''],
    ['[', 'operator', ''],
    ['|', 'operator', ''],
    [']', 'operator', ''],
  ]);

  assert.deepEqual(tokenSummary('s("bd&*3")'), [
    ['s', 'function', 'defaultLibrary'],
    ['*', 'operator', ''],
    ['3', 'number', ''],
  ]);
});

void test('semantic tokens stay safe on incomplete live-coding input', () => {
  assert.deepEqual(tokenSummary('const pat = s("bd sd").fast('), [
    ['pat', 'variable', 'declaration'],
    ['s', 'function', 'defaultLibrary'],
    ['fast', 'method', 'defaultLibrary'],
  ]);
});
