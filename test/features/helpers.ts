import { TextDocument } from 'vscode-languageserver-textdocument';

import type { FeatureContext } from '../../src/features/index.js';
import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
  type LanguageDatabase,
} from '../../src/languageDatabase/index.js';
import { createSemanticEngine, type SemanticCatalog } from '../../src/semantic/index.js';
import { createSyntaxAdapter } from '../../src/syntax/index.js';

export interface FeatureTestHarness {
  readonly context: FeatureContext;
  readonly document: TextDocument;
}

export interface FeatureHarnessOptions {
  readonly database?: LanguageDatabase;
  readonly catalog?: SemanticCatalog;
  readonly uri?: string;
}

const defaultDatabase = createDefaultLanguageDatabase();
const defaultCatalog = createCatalogFromLanguageDatabase(defaultDatabase);
const defaultEngine = createSemanticEngine(defaultCatalog);
const adapter = createSyntaxAdapter();

export function createFeatureHarness(
  text: string,
  offset?: number,
  options: FeatureHarnessOptions = {},
): FeatureTestHarness {
  const database = options.database ?? defaultDatabase;
  const catalog = options.catalog ?? createCatalogFromLanguageDatabase(database);
  const engine =
    options.catalog === undefined && database === defaultDatabase
      ? defaultEngine
      : createSemanticEngine(catalog);
  const document = TextDocument.create(
    options.uri ?? 'file:///test/features.strudel',
    'strudel',
    1,
    text,
  );
  const syntax = adapter.parse({
    uri: document.uri,
    version: document.version,
    text,
  });
  const semantic = engine.analyze(syntax);

  return {
    document,
    context: {
      uri: document.uri,
      text,
      syntax,
      semantic,
      database,
      node: offset === undefined ? undefined : adapter.nodeAt(syntax, offset),
    },
  };
}
