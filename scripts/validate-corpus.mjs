import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reference } from '@strudel/reference';

import {
  createCatalogFromLanguageDatabase,
  createDefaultLanguageDatabase,
} from '../dist/src/languageDatabase/index.js';
import { createSemanticEngine } from '../dist/src/semantic/index.js';
import { createSyntaxAdapter } from '../dist/src/syntax/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(ROOT, 'validation', 'real-corpus.json');
const LOCK_PATH = join(ROOT, 'package-lock.json');
const REFERENCE_MANIFEST = join(ROOT, 'node_modules', '@strudel', 'reference', 'package.json');
const REPORT_SCHEMA = 1;

const EXPECTED_REFERENCE = {
  version: '1.2.2',
  integrity:
    'sha512-1zJwv4U2NVWhw/T2fDL6XJjSKi8ltetw9qX79Lum51g7x0CX1naf6imbkdBzS7QKYyKnUYyHCtxsgFIKyGyiDg==',
  tarball: 'https://registry.npmjs.org/@strudel/reference/-/reference-1.2.2.tgz',
  license: 'AGPL-3.0-or-later',
  repository: 'git+https://codeberg.org/uzu/strudel.git',
};
const EXPECTED_PARSER_VERSION = '2.0.2';

function parseArguments(argv) {
  let writeReport = false;
  for (const argument of argv) {
    if (argument === '--write-report') {
      writeReport = true;
    } else {
      throw new Error(`Unknown corpus validation option: ${argument}`);
    }
  }
  return { writeReport };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function verifyPinnedInputs() {
  const lock = await readJson(LOCK_PATH);
  const referenceEntry = lock.packages?.['node_modules/@strudel/reference'];
  if (referenceEntry === undefined) {
    throw new Error('Missing lockfile entry for @strudel/reference');
  }
  if (referenceEntry.version !== EXPECTED_REFERENCE.version) {
    throw new Error(
      `Version drift for @strudel/reference: expected ${EXPECTED_REFERENCE.version}, found ${referenceEntry.version}`,
    );
  }
  if (referenceEntry.integrity !== EXPECTED_REFERENCE.integrity) {
    throw new Error('Integrity drift for @strudel/reference');
  }
  if (referenceEntry.resolved !== EXPECTED_REFERENCE.tarball) {
    throw new Error('Tarball provenance drift for @strudel/reference');
  }

  const manifest = await readJson(REFERENCE_MANIFEST);
  if (manifest.version !== EXPECTED_REFERENCE.version) {
    throw new Error('Installed version drift for @strudel/reference');
  }
  if (manifest.license !== EXPECTED_REFERENCE.license) {
    throw new Error(`Unexpected licence for @strudel/reference: ${manifest.license}`);
  }
  if (manifest.repository?.url !== EXPECTED_REFERENCE.repository) {
    throw new Error('Unexpected repository provenance for @strudel/reference');
  }

  const parserEntry = lock.packages?.['node_modules/tree-sitter-strudel'];
  if (parserEntry?.version !== EXPECTED_PARSER_VERSION) {
    throw new Error(
      `Expected tree-sitter-strudel@${EXPECTED_PARSER_VERSION}, found ${parserEntry?.version ?? 'no lockfile entry'}`,
    );
  }

  return {
    source: {
      kind: 'pinned-jsdoc-examples',
      package: '@strudel/reference',
      version: EXPECTED_REFERENCE.version,
      tarball: EXPECTED_REFERENCE.tarball,
      integrity: EXPECTED_REFERENCE.integrity,
      license: EXPECTED_REFERENCE.license,
      repository: EXPECTED_REFERENCE.repository,
    },
    parserVersion: parserEntry.version,
    parserIntegrity: parserEntry.integrity,
  };
}

function collectExamples() {
  const examples = [];
  for (const doc of reference.docs ?? []) {
    const name = typeof doc.name === 'string' ? doc.name : '';
    const longName = typeof doc.longname === 'string' ? doc.longname : name;
    const values = Array.isArray(doc.examples) ? doc.examples : [];
    for (const [index, value] of values.entries()) {
      if (typeof value !== 'string' || value.trim() === '') {
        continue;
      }
      examples.push({ id: sha256(value), name, longName, index, text: value });
    }
  }

  examples.sort(
    (left, right) =>
      compareStrings(left.id, right.id) ||
      compareStrings(left.longName, right.longName) ||
      left.index - right.index,
  );
  return examples;
}

function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

function positionAt(starts, offset) {
  let line = 0;
  while (line + 1 < starts.length && starts[line + 1] <= offset) {
    line += 1;
  }
  return { line, character: offset - starts[line] };
}

function rangeWithinDocument(range, starts, textLength) {
  if (
    !Number.isInteger(range.startOffset) ||
    !Number.isInteger(range.endOffset) ||
    range.startOffset < 0 ||
    range.startOffset > range.endOffset ||
    range.endOffset > textLength
  ) {
    return false;
  }
  const expectedStart = positionAt(starts, range.startOffset);
  const expectedEnd = positionAt(starts, range.endOffset);
  return (
    range.start.line === expectedStart.line &&
    range.start.character === expectedStart.character &&
    range.end.line === expectedEnd.line &&
    range.end.character === expectedEnd.character
  );
}

function countSyntaxFacts(node, text, starts, syntaxFacts) {
  const { range } = node;
  syntaxFacts.nodeCount += 1;
  if (node.isError) {
    syntaxFacts.errorNodes += 1;
  }
  if (node.isMissing) {
    syntaxFacts.missingNodes += 1;
  }
  if (
    !rangeWithinDocument(range, starts, text.length) ||
    node.text !== text.slice(range.startOffset, range.endOffset)
  ) {
    syntaxFacts.invalidRanges += 1;
  }
  for (const child of node.children) {
    countSyntaxFacts(child, text, starts, syntaxFacts);
  }
}

function countSemanticFacts(document, text, starts, semanticFacts) {
  for (const symbol of document.symbols.values()) {
    semanticFacts.symbols += 1;
    if (
      symbol.declaration !== undefined &&
      !rangeWithinDocument(symbol.declaration, starts, text.length)
    ) {
      semanticFacts.invalidRanges += 1;
    }
  }
  for (const reference of document.references) {
    semanticFacts.references += 1;
    if (reference.resolvedSymbolId === undefined) {
      semanticFacts.unresolvedReferences += 1;
    }
    if (!rangeWithinDocument(reference.range, starts, text.length)) {
      semanticFacts.invalidRanges += 1;
    }
  }
  for (const argument of document.miniNotationArguments) {
    semanticFacts.miniNotationArguments += 1;
    if (!rangeWithinDocument(argument.range, starts, text.length)) {
      semanticFacts.invalidRanges += 1;
    }
    for (const issue of argument.analysis?.issues ?? []) {
      semanticFacts.miniNotationIssues[issue.code] =
        (semanticFacts.miniNotationIssues[issue.code] ?? 0) + 1;
      if (!rangeWithinDocument(issue.range, starts, text.length)) {
        semanticFacts.invalidRanges += 1;
      }
    }
    for (const token of argument.analysis?.tokens ?? []) {
      if (!rangeWithinDocument(token.range, starts, text.length)) {
        semanticFacts.invalidRanges += 1;
      }
    }
  }
}

function newFacts() {
  return {
    invalidRanges: 0,
    nodeCount: 0,
    errorNodes: 0,
    missingNodes: 0,
    symbols: 0,
    references: 0,
    unresolvedReferences: 0,
    miniNotationArguments: 0,
    miniNotationIssues: {},
  };
}

function reportDifference(actual, expected, prefix = '') {
  if (
    typeof actual !== 'object' ||
    actual === null ||
    typeof expected !== 'object' ||
    expected === null
  ) {
    return actual === expected ? undefined : prefix || 'value';
  }
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  for (const key of keys) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    const difference = reportDifference(actual[key], expected[key], path);
    if (difference !== undefined) {
      return difference;
    }
  }
  return undefined;
}

async function main() {
  const { writeReport } = parseArguments(process.argv.slice(2));
  const pinned = await verifyPinnedInputs();
  const database = createDefaultLanguageDatabase();
  const catalog = createCatalogFromLanguageDatabase(database);
  const adapter = createSyntaxAdapter();
  const engine = createSemanticEngine(catalog);
  const examples = collectExamples();
  const checks = {
    pinnedSource: true,
    parseWithoutThrow: true,
    syntaxRangesValid: true,
    semanticWithoutThrow: true,
    semanticRangesValid: true,
    incrementalWithoutThrow: true,
    incrementalRangesValid: true,
    incrementalCleanPreserved: true,
    incrementalFactsPreserved: true,
  };
  const totals = {
    characters: 0,
    cleanParses: 0,
    parsesWithErrors: 0,
    errorNodes: 0,
    missingNodes: 0,
    symbols: 0,
    references: 0,
    unresolvedReferences: 0,
    miniNotationArguments: 0,
    miniNotationIssues: {},
    incrementalCleanParses: 0,
  };
  const parserGaps = [];

  for (const example of examples) {
    const uri = `file:///corpus/${example.id}.strudel`;
    totals.characters += example.text.length;
    let syntax;
    try {
      syntax = adapter.parse({ uri, version: 1, text: example.text });
    } catch {
      checks.parseWithoutThrow = false;
      continue;
    }

    const starts = lineStarts(example.text);
    const syntaxFacts = newFacts();
    countSyntaxFacts(syntax.root, example.text, starts, syntaxFacts);
    if (syntaxFacts.invalidRanges > 0) {
      checks.syntaxRangesValid = false;
    }
    if (syntax.hasErrors) {
      totals.parsesWithErrors += 1;
      parserGaps.push({
        id: example.id,
        name: example.name,
        longName: example.longName,
        length: example.text.length,
        errorNodes: syntaxFacts.errorNodes,
        missingNodes: syntaxFacts.missingNodes,
      });
    } else {
      totals.cleanParses += 1;
    }
    totals.errorNodes += syntaxFacts.errorNodes;
    totals.missingNodes += syntaxFacts.missingNodes;

    let semantic;
    try {
      semantic = engine.analyze(syntax);
    } catch {
      checks.semanticWithoutThrow = false;
      continue;
    }
    const semanticFacts = newFacts();
    countSemanticFacts(semantic, example.text, starts, semanticFacts);
    if (semanticFacts.invalidRanges > 0) {
      checks.semanticRangesValid = false;
    }
    totals.symbols += semanticFacts.symbols;
    totals.references += semanticFacts.references;
    totals.unresolvedReferences += semanticFacts.unresolvedReferences;
    totals.miniNotationArguments += semanticFacts.miniNotationArguments;
    for (const [code, count] of Object.entries(semanticFacts.miniNotationIssues)) {
      totals.miniNotationIssues[code] = (totals.miniNotationIssues[code] ?? 0) + count;
    }

    const updatedText = `${example.text}\n`;
    const updatedStarts = lineStarts(updatedText);
    let updatedSyntax;
    let updatedSemantic;
    try {
      updatedSyntax = adapter.update(syntax, { uri, version: 2, text: updatedText }, [
        {
          startOffset: example.text.length,
          oldEndOffset: example.text.length,
          newEndOffset: updatedText.length,
        },
      ]);
      updatedSemantic = engine.analyze(updatedSyntax, { previous: semantic });
    } catch {
      checks.incrementalWithoutThrow = false;
      continue;
    }

    const updatedSyntaxFacts = newFacts();
    countSyntaxFacts(updatedSyntax.root, updatedText, updatedStarts, updatedSyntaxFacts);
    const updatedSemanticFacts = newFacts();
    countSemanticFacts(updatedSemantic, updatedText, updatedStarts, updatedSemanticFacts);
    if (updatedSyntaxFacts.invalidRanges > 0 || updatedSemanticFacts.invalidRanges > 0) {
      checks.incrementalRangesValid = false;
    }
    if (
      updatedSemantic.version !== 2 ||
      updatedSemanticFacts.symbols !== semanticFacts.symbols ||
      updatedSemanticFacts.references !== semanticFacts.references ||
      updatedSemanticFacts.miniNotationArguments !== semanticFacts.miniNotationArguments
    ) {
      checks.incrementalFactsPreserved = false;
    }
    if (!syntax.hasErrors) {
      if (updatedSyntax.hasErrors) {
        checks.incrementalCleanPreserved = false;
      } else {
        totals.incrementalCleanParses += 1;
      }
    }
  }

  const report = {
    schemaVersion: REPORT_SCHEMA,
    source: pinned.source,
    corpus: {
      documents: reference.docs?.length ?? 0,
      examples: examples.length,
      characters: totals.characters,
      selection: 'all non-empty string examples in @strudel/reference docs, sorted by SHA-256',
      corpusHash: sha256(examples.map((example) => example.id).join('\n')),
    },
    layers: {
      parser: pinned.parserVersion,
      parserIntegrity: pinned.parserIntegrity,
      catalog: catalog.version,
    },
    checks,
    totals,
    parserGaps,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  if (failedChecks.length > 0) {
    throw new Error(`Corpus validation failed: ${failedChecks.join(', ')}`);
  }

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (writeReport) {
    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, serialized, 'utf8');
    console.log(
      `Wrote ${REPORT_PATH}: ${examples.length} examples, ${totals.cleanParses} clean parses, ${parserGaps.length} parser gaps`,
    );
    return;
  }

  let committed;
  try {
    committed = await readFile(REPORT_PATH, 'utf8');
  } catch {
    throw new Error(`Missing ${REPORT_PATH}; run npm run validate:corpus:write to create it`);
  }
  if (committed !== serialized) {
    const expected = JSON.parse(committed);
    const difference = reportDifference(report, expected);
    throw new Error(
      `Corpus evidence drift at ${difference ?? 'formatting'}; review the change and regenerate deliberately`,
    );
  }
  console.log(
    `Corpus validation passed: ${examples.length} examples, ${totals.cleanParses} clean parses, ${parserGaps.length} parser gaps, 0 invariant failures`,
  );
}

await main();
