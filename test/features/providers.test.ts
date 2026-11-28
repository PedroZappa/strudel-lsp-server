import assert from 'node:assert/strict';

import { test } from 'node:test';

import { parseDiagnosticsConfiguration } from '../../src/configuration/index.js';
import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
  createLanguageDatabase,
  type GeneratedMetadataSnapshot,
  type ManualSemanticSnapshot,
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

void test('diagnostics configuration remaps severity and supports suppression', () => {
  const unknown = createFeatureHarness('unknownFn()');
  const remapped = parseDiagnosticsConfiguration({
    diagnostics: { severity: { 'unknown-global': 'warning' } },
  });
  assert.equal(provideDiagnostics(unknown.context, remapped)[0]?.severity, 'warning');

  const suppressed = parseDiagnosticsConfiguration({
    diagnostics: { severity: { 'unknown-global': 'off' } },
  });
  assert.deepEqual(provideDiagnostics(unknown.context, suppressed), []);

  const disabled = parseDiagnosticsConfiguration({ diagnostics: { enabled: false } });
  assert.deepEqual(provideDiagnostics(unknown.context, disabled), []);
});

void test('completion is position-aware for globals, locals and pattern methods', () => {
  const globalText = 'const loop = 1\nsp';
  const globals = createFeatureHarness(globalText, globalText.length);
  const globalCandidates = provideCompletion(globals.context, globalText.length);
  assert.equal(
    globalCandidates.some((candidate) => candidate.label === 'speed'),
    true,
  );
  const aliasText = 'const loop = 1\nsou';
  const aliasCandidates = provideCompletion(
    createFeatureHarness(aliasText, aliasText.length).context,
    aliasText.length,
  );
  assert.equal(
    aliasCandidates.some((candidate) => candidate.label === 'sound'),
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

  const activePattern = createFeatureHarness('$: s("bd")', 0);
  const activeHover = provideHover(activePattern.context, 0);
  assert.ok(activeHover !== undefined);
  assert.match(activeHover.contents, /Active pattern marker/);
  assert.match(activeHover.contents, /Type: `Pattern`/);
  assert.match(activeHover.contents, /\.p\('\$'\)/);
  assert.match(activeHover.contents, /No playback or scheduler state is inferred/);
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
  assert.equal(fastResult.signatures[0]?.label, 'fast(factor: number | Pattern)');
  assert.equal(fastResult.activeParameter, 0);
  assert.equal(fastResult.signatures[0]?.parameters[0]?.documentation, 'speed up factor');

  const soundText = 's("bd")';
  const soundOffset = soundText.lastIndexOf('bd');
  const sound = createFeatureHarness(soundText, soundOffset);
  const soundResult = provideSignatureHelp(sound.context, soundOffset);
  assert.ok(soundResult !== undefined);
  assert.match(soundResult.signatures[0]?.documentation ?? '', /Select a sound/);
  assert.equal(
    soundResult.signatures[0]?.parameters[0]?.documentation,
    'The sound / pattern of sounds to pick',
  );

  const euclidText = 's("bd").euclid(3, 8)';
  const euclidOffset = euclidText.indexOf('8');
  const euclid = createFeatureHarness(euclidText, euclidOffset);
  const euclidResult = provideSignatureHelp(euclid.context, euclidOffset);
  assert.ok(euclidResult !== undefined);
  assert.equal(euclidResult.signatures[0]?.label, 'euclid(pulses: number, steps: number)');
  assert.equal(euclidResult.activeParameter, 1);
  assert.deepEqual(euclidResult.signatures[0]?.parameters[1]?.labelRange, [23, 36]);
  assert.match(euclidResult.signatures[0]?.documentation ?? '', /Euclidean rhythms/);
  assert.equal(
    euclidResult.signatures[0]?.parameters[0]?.documentation,
    'the number of onsets/beats',
  );
  assert.equal(
    euclidResult.signatures[0]?.parameters[1]?.documentation,
    'the number of steps to fill',
  );

  const nestedText = 's("bd").fast(s("hh").euclid(3, 8))';
  const nestedOffset = nestedText.lastIndexOf('8');
  const nested = createFeatureHarness(nestedText, nestedOffset);
  assert.equal(
    provideSignatureHelp(nested.context, nestedOffset)?.signatures[0]?.label,
    euclidResult.signatures[0]?.label,
  );

  const outsideArgs = createFeatureHarness(fastText, fastText.indexOf('fast'));
  assert.equal(provideSignatureHelp(outsideArgs.context, fastText.indexOf('fast')), undefined);

  const partialText = 's("bd").euclid(3, ';
  const partial = createFeatureHarness(partialText, partialText.length);
  assert.equal(
    provideSignatureHelp(partial.context, partialText.length)?.signatures[0]?.label,
    euclidResult.signatures[0]?.label,
  );

  const userText = 'function mix(a) {}\nmix(1)';
  const userOffset = userText.lastIndexOf('1');
  const user = createFeatureHarness(userText, userOffset);
  assert.equal(
    provideSignatureHelp(user.context, userOffset)?.signatures[0]?.label,
    'mix(a: Unknown)',
  );

  const unknownText = 'notAFunction(1)';
  const unknown = createFeatureHarness(unknownText, unknownText.indexOf('1'));
  assert.equal(provideSignatureHelp(unknown.context, unknownText.indexOf('1')), undefined);
});

void test('signature help selects overloads, rest parameters and user signatures', () => {
  const generated: GeneratedMetadataSnapshot = {
    schemaVersion: 1,
    id: 'fixture-overloads',
    strudelVersion: '1.2.6',
    sources: [],
    symbols: [
      {
        name: 'pick',
        longName: 'pick',
        kind: 'function',
        scope: 'global',
        returnType: 'Unknown',
        examples: [],
        parameters: [],
        returns: [],
        synonyms: [],
      },
      {
        name: 'empty',
        longName: 'empty',
        kind: 'function',
        scope: 'global',
        returnType: 'Unknown',
        examples: [],
        parameters: [{ name: 'value', types: [], description: 'a value' }],
        returns: [],
        synonyms: [],
      },
    ],
  };
  const manual: ManualSemanticSnapshot = {
    schemaVersion: 1,
    entries: [
      {
        longName: 'pick',
        returnType: 'Unknown',
        signatures: [
          {
            label: 'pick(value: number, gain?: number)',
            parameters: [{ label: 'value: number' }, { label: 'gain?: number', optional: true }],
            source: 'catalog',
          },
          {
            label: 'pick(value: string, mode: string)',
            parameters: [{ label: 'value: string' }, { label: 'mode: string' }],
            source: 'catalog',
          },
        ],
        evidence: [],
      },
      {
        longName: 'empty',
        returnType: 'Unknown',
        signatures: [],
        evidence: [],
      },
    ],
  };
  const database = createLanguageDatabase({ versions: [{ generated, manual }] });
  const overloadText = 'pick("a", "b")';
  const overloadOffset = overloadText.lastIndexOf('b');
  const overload = createFeatureHarness(overloadText, overloadOffset, { database });
  const overloadResult = provideSignatureHelp(overload.context, overloadOffset);
  assert.ok(overloadResult !== undefined);
  assert.equal(overloadResult.signatures.length, 2);
  assert.equal(overloadResult.activeSignature, 1);
  assert.equal(overloadResult.activeParameter, 1);
  assert.equal(overloadResult.signatures[0]?.parameters[1]?.optional, true);

  const emptyText = 'empty(1)';
  const emptyOffset = emptyText.lastIndexOf('1');
  const empty = createFeatureHarness(emptyText, emptyOffset, { database });
  assert.equal(
    provideSignatureHelp(empty.context, emptyOffset)?.signatures[0]?.label,
    'empty(value)',
  );

  const restText = 'cat(s("bd"), s("hh"), s("hh"))';
  const restOffset = restText.lastIndexOf('s("hh")');
  const rest = createFeatureHarness(restText, restOffset);
  const restResult = provideSignatureHelp(rest.context, restOffset);
  assert.equal(restResult?.signatures[0]?.label, 'cat(...pats: Pattern)');
  assert.equal(restResult?.signatures[0]?.parameters[0]?.rest, true);
  assert.equal(restResult?.activeParameter, 0);

  const aliasText = 'sound("bd")';
  const aliasOffset = aliasText.lastIndexOf('bd');
  const alias = createFeatureHarness(aliasText, aliasOffset);
  assert.equal(
    provideSignatureHelp(alias.context, aliasOffset)?.signatures[0]?.label,
    'sound(sound: string | Pattern)',
  );

  const shadowedText = 'const s = 5\ns(1)';
  const shadowedOffset = shadowedText.lastIndexOf('1');
  const shadowed = createFeatureHarness(shadowedText, shadowedOffset);
  assert.equal(provideSignatureHelp(shadowed.context, shadowedOffset), undefined);

  const inferredUserText = 'function slower(p){ return p.slow(2) }\nslower(s("bd"))';
  const inferredUserOffset = inferredUserText.lastIndexOf('s("bd")');
  const inferredUser = createFeatureHarness(inferredUserText, inferredUserOffset);
  assert.equal(
    provideSignatureHelp(inferredUser.context, inferredUserOffset)?.signatures[0]?.label,
    'slower(p: Pattern)',
  );

  const userRestText = 'function collect(...xs) { return xs }\ncollect(1, 2)';
  const userRestOffset = userRestText.lastIndexOf('2');
  const userRest = createFeatureHarness(userRestText, userRestOffset);
  const userRestResult = provideSignatureHelp(userRest.context, userRestOffset);
  assert.equal(userRestResult?.signatures[0]?.label, 'collect(...xs: Unknown)');
  assert.equal(userRestResult?.activeParameter, 0);
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

void test('hover documents mini-notation operators and grouped structure', () => {
  const text = 's("bd [hh]*2")';
  const offset = text.indexOf('*');
  const harness = createFeatureHarness(text, offset);
  const hover = provideHover(harness.context, offset);
  assert.ok(hover !== undefined);
  assert.match(hover.contents, /mini notation repeat/);
  assert.match(hover.contents, /\.fast\(3\)/);
  assert.deepEqual([hover.range.startOffset, hover.range.endOffset], [offset, offset + 1]);

  const delimiterOffset = text.indexOf('[');
  const delimiter = createFeatureHarness(text, delimiterOffset);
  const delimiterHover = provideHover(delimiter.context, delimiterOffset);
  assert.ok(delimiterHover !== undefined);
  assert.match(delimiterHover.contents, /^`\[` — mini notation subsequence/m);
  assert.match(delimiterHover.contents, /Sub-sequence/);
});

void test('completion suggests pinned mini operators without entering JavaScript completion', () => {
  const text = 's("bd*")';
  const offset = text.indexOf('*');
  const harness = createFeatureHarness(text, offset);
  const candidates = provideCompletion(harness.context, offset);
  assert.deepEqual(
    candidates.map((candidate) => candidate.label),
    ['*'],
  );
  assert.equal(candidates[0]?.detail, 'mini notation operator');
  assert.match(candidates[0]?.documentation ?? '', /Speed up/);
  assert.deepEqual(
    [candidates[0]?.replacementRange.startOffset, candidates[0]?.replacementRange.endOffset],
    [offset, offset + 1],
  );

  const onStep = createFeatureHarness(text, text.indexOf('bd'));
  assert.deepEqual(provideCompletion(onStep.context, text.indexOf('bd')), []);
});

void test('signature help stays scoped to the host call inside mini notation', () => {
  const text = 's("bd:0:0.3")';
  const offset = text.lastIndexOf('bd');
  const harness = createFeatureHarness(text, offset);
  const result = provideSignatureHelp(harness.context, offset);
  assert.ok(result !== undefined);
  assert.equal(result.signatures[0]?.label, 's(sound: string | Pattern)');
  assert.equal(result.activeParameter, 0);
  assert.equal(provideSignatureHelp(harness.context, text.indexOf('0.3'))?.signatures.length, 1);
});

void test('incremental edits keep mini-notation AST ranges aligned through rapid edits', () => {
  const database = createDefaultLanguageDatabase();
  const engine = createSemanticEngine(createCatalogFromLanguageDatabase(database));
  const documents = new DocumentAnalysisService(createSyntaxAdapter(), engine);
  const uri = 'file:///test/incremental.strudel';

  const assertAligned = (): void => {
    const analyzed = documents.get(uri);
    assert.ok(analyzed !== undefined);
    const analysis = analyzed.semantic.miniNotationArguments[0]?.analysis;
    const issue = analysis?.issues[0];
    const root = analysis?.ast.root;
    const group = root?.children[0];
    assert.ok(analysis !== undefined && issue !== undefined && root !== undefined);
    assert.equal(issue.code, 'empty-group');
    assert.equal(root.kind, 'sequence');
    assert.equal(root.range.startOffset, issue.range.startOffset);
    assert.equal(root.range.endOffset, issue.range.endOffset);
    assert.equal(group?.kind, 'subsequence');
    assert.equal(group?.empty, true);
    assert.equal(group?.range.startOffset, issue.range.startOffset);
    assert.equal(group?.range.endOffset, issue.range.endOffset);
    assert.equal(issue.range.startOffset, analyzed.document.getText().indexOf('[]'));
  };

  documents.open({
    textDocument: { uri, languageId: 'strudel', version: 1, text: 's("[]")' },
  });
  assertAligned();

  documents.change({
    textDocument: { uri, version: 2 },
    contentChanges: [
      {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        text: 'const intro = 1\n',
      },
    ],
  });
  assertAligned();
  const shifted = documents.get(uri);
  assert.equal(
    shifted?.semantic.miniNotationArguments[0]?.analysis?.issues[0]?.range.start.line,
    1,
  );

  documents.change({
    textDocument: { uri, version: 3 },
    contentChanges: [
      {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        text: '// rapid\n',
      },
    ],
  });
  assertAligned();

  documents.change({
    textDocument: { uri, version: 4 },
    contentChanges: [
      {
        range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } },
        text: '',
      },
    ],
  });
  assertAligned();
});
