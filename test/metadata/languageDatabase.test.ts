import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from 'node:test';

import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
  createLanguageDatabase,
  type GeneratedMetadataSnapshot,
  type RuntimeSymbolMetadata,
} from '../../src/languageDatabase/index.js';
import { generatedMetadata } from '../../src/languageDatabase/generated.js';
import { manualSemanticSnapshot } from '../../src/languageDatabase/manual.js';
import { createSemanticEngine, NUMBER_TYPE, PATTERN_TYPE } from '../../src/semantic/index.js';
import type { FixtureNodeSpec } from '../semantic/fixtures.js';
import { createFixtureDocument } from '../semantic/fixtures.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

void test('metadata generation is reproducible from pinned inputs', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'strudel-metadata-'));

  try {
    const outputPath = join(temporaryDirectory, 'generated.ts');
    execFileSync(
      process.execPath,
      [join(repositoryRoot, 'scripts/generate-metadata.mjs'), '--output', outputPath],
      {
        cwd: repositoryRoot,
        stdio: 'pipe',
      },
    );

    const generatedFile = readFileSync(
      join(repositoryRoot, 'src', 'languageDatabase', 'generated.ts'),
      'utf8',
    );
    assert.equal(readFileSync(outputPath, 'utf8'), generatedFile);
    assert.equal(generatedFile.includes('/Users/'), false);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

void test('generated snapshot records authoritative provenance', () => {
  const snapshot = createDefaultLanguageDatabase().getSnapshot();

  assert.equal(snapshot.version, 'strudel-1.2.6');
  assert.equal(snapshot.generated.schemaVersion, 1);
  assert.equal(snapshot.generated.strudelVersion, '1.2.6');
  assert.equal(snapshot.generated.sources.length, 4);
  assert.equal(snapshot.generated.symbols.length, 576);

  const referenceSource = snapshot.generated.sources.find(
    (source) => source.packageName === '@strudel/reference',
  );
  assert.ok(referenceSource !== undefined);
  assert.equal(referenceSource.version, '1.2.2');
  assert.equal(referenceSource.role, 'record-source');
  assert.equal(referenceSource.license, 'AGPL-3.0-or-later');
  assert.equal(referenceSource.repository, 'git+https://codeberg.org/uzu/strudel.git');
  assert.equal(
    referenceSource.integrity,
    'sha512-1zJwv4U2NVWhw/T2fDL6XJjSKi8ltetw9qX79Lum51g7x0CX1naf6imbkdBzS7QKYyKnUYyHCtxsgFIKyGyiDg==',
  );
  assert.equal(
    snapshot.generated.sources.every((source) => source.license === 'AGPL-3.0-or-later'),
    true,
  );
});

void test('language database serves offline global and pattern method metadata', () => {
  const database = createDefaultLanguageDatabase();
  const catalog = createCatalogFromLanguageDatabase(database);

  assert.match(catalog.version, /^strudel-1\.2\.6:/);

  const globalEntry = catalog.getGlobal('s');
  assert.ok(globalEntry !== undefined);
  assert.equal(globalEntry.kind, 'function');
  assert.equal(globalEntry.type.kind, 'Function');
  assert.equal(globalEntry.type.returnType?.kind, 'Pattern');
  assert.deepEqual(globalEntry.miniNotationArguments, [0]);

  const methodEntry = catalog.getMethod('fast', PATTERN_TYPE);
  assert.ok(methodEntry !== undefined);
  assert.equal(methodEntry.kind, 'method');
  assert.equal(methodEntry.type.kind, 'PatternMethod');
  assert.equal(methodEntry.type.returnType?.kind, 'Pattern');

  assert.equal(catalog.getMethod('fast', NUMBER_TYPE), undefined);
  assert.equal(catalog.getSample('bd'), undefined);

  const sRecord = database.getGlobalRecord('s');
  assert.ok(sRecord !== undefined);
  assert.equal(sRecord.origin, 'manual');
  assert.equal(sRecord.description?.startsWith('Select a sound / sample by name.'), true);
  assert.equal(sRecord.examples.includes('s("bd hh")'), true);
});

void test('version selection and runtime-derived entries are explicit', () => {
  const runtime: readonly RuntimeSymbolMetadata[] = [
    { name: 'bd', kind: 'sample', returnType: 'SampleName' },
    { name: 'runtimeOnly', kind: 'global', returnType: 'Pattern' },
  ];
  const alternate = {
    ...generatedMetadata,
    id: 'strudel-test',
    strudelVersion: 'test',
  } satisfies GeneratedMetadataSnapshot;

  const database = createLanguageDatabase({
    versions: [
      { generated: generatedMetadata, manual: manualSemanticSnapshot, runtime },
      { generated: alternate, manual: manualSemanticSnapshot },
    ],
    defaultVersion: generatedMetadata.id,
  });
  const catalog = createCatalogFromLanguageDatabase(database);

  assert.deepEqual(database.listVersions(), ['strudel-1.2.6', 'strudel-test']);
  assert.equal(database.getSnapshot('strudel-test').generated.strudelVersion, 'test');
  assert.throws(() => database.getSnapshot('missing'), /Unknown Strudel metadata version/);
  assert.throws(
    () =>
      createLanguageDatabase({
        versions: [
          { generated: generatedMetadata, manual: manualSemanticSnapshot },
          { generated: generatedMetadata, manual: manualSemanticSnapshot },
        ],
      }),
    /Duplicate Strudel metadata version/,
  );

  assert.equal(catalog.getSample('bd')?.type.kind, 'SampleName');
  assert.equal(catalog.getGlobal('runtimeOnly')?.type.returnType?.kind, 'Pattern');
});

void test('semantic engine consumes the generated language database', () => {
  const text = 'const pat = s("bd sd").fast(2)';
  const call: FixtureNodeSpec = {
    kind: 'callExpression',
    text: 's("bd sd")',
    children: [
      { kind: 'identifier', text: 's' },
      {
        kind: 'arguments',
        text: '("bd sd")',
        children: [{ kind: 'string', text: '"bd sd"' }],
      },
    ],
  };
  const chainedCall: FixtureNodeSpec = {
    kind: 'callExpression',
    text: 's("bd sd").fast(2)',
    children: [
      {
        kind: 'memberExpression',
        text: 's("bd sd").fast',
        children: [call, { kind: 'token', text: '.' }, { kind: 'identifier', text: 'fast' }],
      },
      {
        kind: 'arguments',
        text: '(2)',
        children: [{ kind: 'number', text: '2' }],
      },
    ],
  };
  const { document } = createFixtureDocument(text, [
    {
      kind: 'variableDeclaration',
      text,
      children: [
        { kind: 'token', text: 'const' },
        {
          kind: 'variableDeclarator',
          text: 'pat = s("bd sd").fast(2)',
          children: [
            { kind: 'identifier', text: 'pat' },
            { kind: 'token', text: '=' },
            chainedCall,
          ],
        },
      ],
    },
  ]);
  const catalog = createCatalogFromLanguageDatabase(createDefaultLanguageDatabase());
  const result = createSemanticEngine(catalog).analyze(document);
  const patSymbol = [...result.symbols.values()].find((symbol) => symbol.name === 'pat');

  assert.ok(patSymbol !== undefined);
  assert.equal(patSymbol.type.kind, 'Pattern');
  assert.equal(result.miniNotationArguments.length, 1);
  assert.equal(result.miniNotationArguments[0]?.ownerName, 's');
});

void test('indexes unambiguous generated synonyms and curated signatures', () => {
  const database = createDefaultLanguageDatabase();
  const sound = database.getGlobalRecord('sound');
  assert.ok(sound !== undefined);
  assert.equal(sound.aliasOf, 's');
  assert.equal(sound.name, 'sound');

  const density = database.getMethodRecord('density');
  assert.ok(density !== undefined);
  assert.equal(density.aliasOf, 'Pattern.fast');

  assert.equal(database.getGlobalRecord('ir'), undefined);
  assert.equal(database.getGlobalRecord('dt'), undefined);

  assert.equal(database.getGlobalRecord('s')?.signatures?.[0]?.label, 's(sound: string | Pattern)');
  assert.equal(database.getMethodRecord('euclid')?.signatures?.[0]?.parameters.length, 2);
  assert.equal(database.getGlobalRecord('stack')?.signatures?.[0]?.parameters[0]?.rest, true);
});
