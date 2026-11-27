import { TextDocument } from 'vscode-languageserver-textdocument';

import type { FeatureContext } from '../../src/features/index.js';
import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
} from '../../src/languageDatabase/index.js';
import { createSemanticEngine } from '../../src/semantic/index.js';
import { createSyntaxAdapter } from '../../src/syntax/index.js';

export interface FeatureTestHarness {
  readonly context: FeatureContext;
  readonly document: TextDocument;
}

const database = createDefaultLanguageDatabase();
const engine = createSemanticEngine(createCatalogFromLanguageDatabase(database));
const adapter = createSyntaxAdapter();

export function createFeatureHarness(text: string, offset?: number): FeatureTestHarness {
  const document = TextDocument.create('file:///test/features.strudel', 'strudel', 1, text);
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
