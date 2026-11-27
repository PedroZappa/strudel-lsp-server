import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DocumentAnalysisService } from '../../src/lsp/index.js';
import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
} from '../../src/languageDatabase/index.js';
import { createInMemoryLocalTiming } from '../../src/performance/index.js';
import {
  createSemanticEngine,
  type SemanticDocument,
  type SemanticSymbol,
} from '../../src/semantic/index.js';
import { createSyntaxAdapter } from '../../src/syntax/index.js';

const URI = 'file:///test/incremental-analysis.strudel';
const EDIT_COUNT = 8;

function findVariable(document: SemanticDocument, name: string): SemanticSymbol {
  const symbol = [...document.symbols.values()].find(
    (candidate) => candidate.name === name && candidate.kind === 'variable',
  );
  assert.ok(symbol, `missing variable ${name}`);
  return symbol;
}

void test('rapid ranged declaration edits preserve references and reuse other statements', () => {
  const adapter = createSyntaxAdapter();
  const engine = createSemanticEngine(
    createCatalogFromLanguageDatabase(createDefaultLanguageDatabase()),
  );
  const timing = createInMemoryLocalTiming();
  const service = new DocumentAnalysisService(adapter, engine, timing.recorder);

  service.open({
    textDocument: {
      uri: URI,
      languageId: 'strudel',
      version: 1,
      text: 'const pat = s("bd")\npat.fast(2)',
    },
  });

  for (let edit = 0; edit < EDIT_COUNT; edit += 1) {
    const previous = service.get(URI);
    assert.ok(previous, 'the document must remain open');
    const target = edit % 2 === 0 ? 'bd' : 'sd';
    const replacement = edit % 2 === 0 ? 'sd' : 'bd';
    const offset = previous.document.getText().indexOf(`"${target}"`) + 1;
    const start = previous.document.positionAt(offset);
    const end = previous.document.positionAt(offset + target.length);
    const analyzed = service.change({
      textDocument: { uri: URI, version: edit + 2 },
      contentChanges: [{ range: { start, end }, text: replacement }],
    });

    const symbol = findVariable(analyzed.semantic, 'pat');
    const reference = analyzed.semantic.references.find((candidate) => candidate.name === 'pat');
    assert.equal(symbol.type.kind, 'Pattern');
    assert.equal(reference?.resolvedSymbolId, symbol.id);
  }

  const samples = timing.samples();
  const totalCount = (name: string): number =>
    samples
      .filter((sample) => sample.name === name)
      .reduce((total, sample) => total + (sample.count ?? 0), 0);
  assert.equal(totalCount('semantic.statements.reused'), EDIT_COUNT);
  assert.equal(totalCount('semantic.statements.analyzed'), EDIT_COUNT + 2);
  assert.equal(
    samples.filter((sample) => sample.name === 'document.analyze').length,
    EDIT_COUNT + 1,
  );
});
