import assert from 'node:assert/strict';

import { test } from 'node:test';

import { provideWorkspaceSymbols } from '../../src/features/index.js';
import type { FeatureContext } from '../../src/features/index.js';
import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
} from '../../src/languageDatabase/index.js';
import { createSemanticEngine } from '../../src/semantic/index.js';
import { createSyntaxAdapter } from '../../src/syntax/index.js';

const database = createDefaultLanguageDatabase();
const engine = createSemanticEngine(createCatalogFromLanguageDatabase(database));
const adapter = createSyntaxAdapter();

function createContext(uri: string, text: string): FeatureContext {
  const syntax = adapter.parse({ uri, version: 1, text });
  const semantic = engine.analyze(syntax);
  return { uri, text, syntax, semantic, database };
}

const contexts: readonly FeatureContext[] = [
  createContext('file:///workspace/a.strudel', 'const kick = "bd";\ns(kick);'),
  createContext('file:///workspace/b.strudel', 'function play(drum) { return s(drum); }'),
];

void test('workspace symbols use relaxed case-insensitive matching across documents', () => {
  const symbols = provideWorkspaceSymbols(contexts, 'PL');

  assert.deepEqual(
    symbols.map((symbol) => ({
      name: symbol.name,
      uri: symbol.uri,
      kind: symbol.kind,
      containerName: symbol.containerName,
    })),
    [
      {
        name: 'play',
        uri: 'file:///workspace/b.strudel',
        kind: 'function',
        containerName: undefined,
      },
    ],
  );

  assert.equal(provideWorkspaceSymbols(contexts, 'IC')[0]?.name, 'kick');
});

void test('workspace symbols flatten verified outlines with container names', () => {
  const symbols = provideWorkspaceSymbols(contexts, '');
  const names = symbols.map((symbol) => symbol.name);

  assert.deepEqual(names, ['drum', 'kick', 'play']);
  assert.equal(
    symbols.some((symbol) => symbol.name === 's'),
    false,
  );

  const drum = symbols.find((symbol) => symbol.name === 'drum');
  assert.equal(drum?.uri, 'file:///workspace/b.strudel');
  assert.equal(drum?.containerName, 'play');
  assert.equal(drum?.kind, 'parameter');
  assert.equal(
    drum === undefined
      ? undefined
      : contexts[1]?.text.slice(drum.range.startOffset, drum.range.endOffset),
    'drum',
  );
});

void test('workspace symbols respect the result limit', () => {
  assert.equal(provideWorkspaceSymbols(contexts, '', 1).length, 1);
  assert.deepEqual(provideWorkspaceSymbols(contexts, '', 0), []);
});
