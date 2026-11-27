import assert from 'node:assert/strict';

import { test } from 'node:test';

import {
  provideCompletion,
  provideDefinition,
  provideDiagnostics,
  provideHover,
  provideReferences,
} from '../../src/features/index.js';

import { createFeatureHarness } from './helpers.js';

void test('diagnostics stay quiet for valid source and report unknown calls conservatively', () => {
  const valid = createFeatureHarness('const pat = s("bd sd").fast(2)\npat');
  assert.deepEqual(provideDiagnostics(valid.context), []);

  const unknown = createFeatureHarness('unknownFn()');
  const diagnostics = provideDiagnostics(unknown.context);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, 'unknown-global');
  assert.equal(diagnostics[0]?.severity, 'information');

  const unknownMethod = createFeatureHarness('s("bd").nope()');
  assert.equal(provideDiagnostics(unknownMethod.context)[0]?.code, 'unknown-pattern-method');
});

void test('incomplete live-coding input never produces error diagnostics', () => {
  const incomplete = createFeatureHarness('const pat = s("bd sd").fast(');
  const diagnostics = provideDiagnostics(incomplete.context);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    false,
  );
});

void test('completion is position-aware for globals, locals and pattern methods', () => {
  const globalText = 'const loop = 1\nsp';
  const globals = createFeatureHarness(globalText, globalText.length);
  const globalCandidates = provideCompletion(globals.context, globalText.length);
  assert.equal(
    globalCandidates.some((candidate) => candidate.label === 'speed'),
    true,
  );
  assert.equal(
    globalCandidates.some((candidate) => candidate.label === 'loop'),
    false,
  );

  const localText = 'const loop = 1\nloo';
  const locals = createFeatureHarness(localText, localText.length);
  assert.equal(
    provideCompletion(locals.context, localText.length).some(
      (candidate) => candidate.label === 'loop' && candidate.kind === 'variable',
    ),
    true,
  );

  const methodText = 's("bd").fa';
  const methods = createFeatureHarness(methodText, methodText.length);
  const methodCandidates = provideCompletion(methods.context, methodText.length);
  assert.equal(
    methodCandidates.some((candidate) => candidate.label === 'fast'),
    true,
  );
  assert.equal(
    methodCandidates.every((candidate) => candidate.kind === 'method'),
    true,
  );
  assert.equal(methodCandidates[0]?.replacementRange.startOffset, 8);

  const stringText = 's("bd").fa';
  const insideString = createFeatureHarness(stringText, 4);
  assert.deepEqual(provideCompletion(insideString.context, 4), []);
});

void test('hover uses database documentation for globals and semantic types for locals', () => {
  const builtin = createFeatureHarness('s("bd sd")', 0);
  const builtinHover = provideHover(builtin.context, 0);
  assert.ok(builtinHover !== undefined);
  assert.match(builtinHover.contents, /Select a sound/);
  assert.match(builtinHover.contents, /Type:/);

  const text = 'const pat = s("bd sd")\npat';
  const offset = text.lastIndexOf('pat') + 1;
  const local = createFeatureHarness(text, offset);
  const localHover = provideHover(local.context, offset);
  assert.ok(localHover !== undefined);
  assert.match(localHover.contents, /Variable/);
  assert.match(localHover.contents, /Pattern/);
});

void test('definition and references use resolved semantic symbols', () => {
  const text = 'const pat = s("bd").fast(2)\npat';
  const usageOffset = text.lastIndexOf('pat') + 1;
  const usage = createFeatureHarness(text, usageOffset);
  const definition = provideDefinition(usage.context, usageOffset);
  assert.ok(definition !== undefined);
  assert.equal(definition.range.startOffset, 6);

  const declarationOffset = 7;
  const declaration = createFeatureHarness(text, declarationOffset);
  const allReferences = provideReferences(declaration.context, declarationOffset, true);
  assert.deepEqual(
    allReferences.map((reference) => reference.range.startOffset).sort((a, b) => a - b),
    [6, text.lastIndexOf('pat')],
  );

  const withoutDeclaration = provideReferences(declaration.context, declarationOffset, false);
  assert.deepEqual(
    withoutDeclaration.map((reference) => reference.range.startOffset),
    [text.lastIndexOf('pat')],
  );

  const builtin = createFeatureHarness('s("bd")', 0);
  assert.equal(provideDefinition(builtin.context, 0), undefined);
});
