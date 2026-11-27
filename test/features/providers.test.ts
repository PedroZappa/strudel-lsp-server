import assert from 'node:assert/strict';

import { test } from 'node:test';

import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
} from '../../src/languageDatabase/index.js';
import { DocumentAnalysisService } from '../../src/lsp/index.js';
import { createSemanticEngine } from '../../src/semantic/index.js';
import { createSyntaxAdapter } from '../../src/syntax/index.js';

import {
  provideCompletion,
  provideDefinition,
  provideDiagnostics,
  provideHover,
  provideReferences,
  provideSignatureHelp,
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

void test('signature help uses database parameters and tracks the active argument', () => {
  const fastText = 's("bd").fast(2)';
  const fastOffset = fastText.indexOf('2');
  const fast = createFeatureHarness(fastText, fastOffset);
  const fastResult = provideSignatureHelp(fast.context, fastOffset);
  assert.ok(fastResult !== undefined);
  assert.equal(fastResult.label, 'fast(factor: number | Pattern)');
  assert.equal(fastResult.activeParameter, 0);
  assert.equal(fastResult.parameters[0]?.documentation, 'speed up factor');

  const euclidText = 's("bd").euclid(3, 8)';
  const euclidOffset = euclidText.indexOf('8');
  const euclid = createFeatureHarness(euclidText, euclidOffset);
  const euclidResult = provideSignatureHelp(euclid.context, euclidOffset);
  assert.ok(euclidResult !== undefined);
  assert.equal(euclidResult.label, 'euclid(pulses: number, steps: number)');
  assert.equal(euclidResult.activeParameter, 1);
  assert.deepEqual(euclidResult.parameters[1]?.labelRange, [23, 36]);

  const nestedText = 's("bd").fast(s("hh").euclid(3, 8))';
  const nestedOffset = nestedText.lastIndexOf('8');
  const nested = createFeatureHarness(nestedText, nestedOffset);
  assert.equal(provideSignatureHelp(nested.context, nestedOffset)?.label, euclidResult.label);

  const outsideArgs = createFeatureHarness(fastText, fastText.indexOf('fast'));
  assert.equal(provideSignatureHelp(outsideArgs.context, fastText.indexOf('fast')), undefined);

  const partialText = 's("bd").euclid(3, ';
  const partial = createFeatureHarness(partialText, partialText.length);
  assert.equal(
    provideSignatureHelp(partial.context, partialText.length)?.label,
    euclidResult.label,
  );

  const userText = 'function mix(a) {}\nmix(1)';
  const userOffset = userText.lastIndexOf('1');
  const user = createFeatureHarness(userText, userOffset);
  assert.equal(provideSignatureHelp(user.context, userOffset), undefined);

  const unknownText = 'notAFunction(1)';
  const unknown = createFeatureHarness(unknownText, unknownText.indexOf('1'));
  assert.equal(provideSignatureHelp(unknown.context, unknownText.indexOf('1')), undefined);
});

void test('mini-notation diagnostics report structural faults but not incomplete input', () => {
  const invalid = createFeatureHarness('s("[]")');
  const diagnostics = provideDiagnostics(invalid.context);
  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === 'empty-group'),
    true,
  );

  const incomplete = createFeatureHarness('s("bd sd [")');
  assert.deepEqual(provideDiagnostics(incomplete.context), []);
});

void test('hover documents mini-notation operators', () => {
  const text = 's("bd [hh]*2")';
  const offset = text.indexOf('*');
  const harness = createFeatureHarness(text, offset);
  const hover = provideHover(harness.context, offset);
  assert.ok(hover !== undefined);
  assert.match(hover.contents, /mini notation repeat/);
  assert.match(hover.contents, /\.fast\(3\)/);
});

void test('incremental edits keep mini-notation analysis ranges aligned', () => {
  const database = createDefaultLanguageDatabase();
  const engine = createSemanticEngine(createCatalogFromLanguageDatabase(database));
  const documents = new DocumentAnalysisService(createSyntaxAdapter(), engine);
  const uri = 'file:///test/incremental.strudel';

  documents.open({
    textDocument: { uri, languageId: 'strudel', version: 1, text: 's("[]")' },
  });
  const firstIssue = documents.get(uri)?.semantic.miniNotationArguments[0]?.analysis?.issues[0];
  assert.equal(firstIssue?.code, 'empty-group');

  documents.change({
    textDocument: { uri, version: 2 },
    contentChanges: [
      {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        text: 'const intro = 1\n',
      },
    ],
  });

  const analyzed = documents.get(uri);
  assert.ok(analyzed !== undefined);
  const issue = analyzed.semantic.miniNotationArguments[0]?.analysis?.issues[0];
  assert.ok(issue !== undefined);
  assert.equal(issue.range.start.line, 1);
  assert.equal(issue.range.startOffset, analyzed.document.getText().indexOf('[]'));
});
