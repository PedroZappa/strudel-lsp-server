import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { reference } from '@strudel/reference';
import { format, resolveConfig } from 'prettier';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const defaultOutput = join(repositoryRoot, 'src', 'languageDatabase', 'generated.ts');

const expectedSources = [
  {
    packageName: '@strudel/reference',
    version: '1.2.2',
    tarball: 'https://registry.npmjs.org/@strudel/reference/-/reference-1.2.2.tgz',
    integrity:
      'sha512-1zJwv4U2NVWhw/T2fDL6XJjSKi8ltetw9qX79Lum51g7x0CX1naf6imbkdBzS7QKYyKnUYyHCtxsgFIKyGyiDg==',
    role: 'record-source',
  },
  {
    packageName: '@strudel/core',
    version: '1.2.6',
    tarball: 'https://registry.npmjs.org/@strudel/core/-/core-1.2.6.tgz',
    integrity:
      'sha512-FA5Kxv3U+UhNRLIeuEpXck2o2J5AjHZbkAdSAK9Q2N3Az1G9Vnc+bXXfgDFyY3yRH9mXXQvTerz8jr876pGGng==',
    role: 'integrity-input',
  },
  {
    packageName: '@strudel/mini',
    version: '1.2.6',
    tarball: 'https://registry.npmjs.org/@strudel/mini/-/mini-1.2.6.tgz',
    integrity:
      'sha512-I5GFPLHI3TPcJuD2RdDcurA+lTogaSQ0TB+EimKTgEtSAbU6ZMEkSUOXZIFO5eaAcJcMucgKaBcmTKpD4oZjPA==',
    role: 'integrity-input',
  },
  {
    packageName: '@strudel/transpiler',
    version: '1.2.6',
    tarball: 'https://registry.npmjs.org/@strudel/transpiler/-/transpiler-1.2.6.tgz',
    integrity:
      'sha512-NzmyQDS4BqjafOPzHGFowxILDx3ZRAPD47YszxNaPB7PggMA2rMo9t3rLz80G0GxA0ZAyMbVMR3px9jDWnJ5hg==',
    role: 'integrity-input',
  },
];

function parseOutputPath(argv) {
  const args = [...argv];
  const outputIndex = args.indexOf('--output');
  let outputPath = defaultOutput;

  if (outputIndex >= 0) {
    const value = args[outputIndex + 1];
    if (value === undefined) {
      throw new Error('--output requires a file path');
    }
    outputPath = resolve(value);
    args.splice(outputIndex, 2);
  }

  if (args.length > 0) {
    throw new Error(`Unexpected arguments: ${args.join(' ')}`);
  }

  return outputPath;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function verifyPinnedSources(lock) {
  const sources = [];

  for (const expected of expectedSources) {
    const lockEntry = lock.packages?.[`node_modules/${expected.packageName}`];
    if (lockEntry === undefined) {
      throw new Error(`Missing package-lock entry for ${expected.packageName}`);
    }
    if (lockEntry.version !== expected.version) {
      throw new Error(
        `Version drift for ${expected.packageName}: expected ${expected.version}, found ${lockEntry.version}`,
      );
    }
    if (lockEntry.integrity !== expected.integrity) {
      throw new Error(`Integrity drift for ${expected.packageName}`);
    }

    const packagePath = join(repositoryRoot, 'node_modules', expected.packageName, 'package.json');
    const packageMetadata = readJson(packagePath);
    if (packageMetadata.version !== expected.version) {
      throw new Error(`Installed version drift for ${expected.packageName}`);
    }
    if (packageMetadata.license !== 'AGPL-3.0-or-later') {
      throw new Error(`Unexpected licence for ${expected.packageName}: ${packageMetadata.license}`);
    }
    if (packageMetadata.repository?.url !== 'git+https://codeberg.org/uzu/strudel.git') {
      throw new Error(`Unexpected repository provenance for ${expected.packageName}`);
    }

    sources.push({
      packageName: expected.packageName,
      version: expected.version,
      tarball: expected.tarball,
      integrity: expected.integrity,
      license: packageMetadata.license,
      repository: packageMetadata.repository.url,
      role: expected.role,
    });
  }

  return sources;
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stripHtml(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return text === '' ? undefined : text;
}

function normalizeKind(kind) {
  switch (kind) {
    case 'function':
    case 'member':
    case 'constant':
    case 'class':
    case 'package':
      return kind;
    default:
      return 'value';
  }
}

function normalizeScope(scope) {
  switch (scope) {
    case 'global':
    case 'static':
    case 'instance':
    case 'inner':
      return scope;
    default:
      return 'unknown';
  }
}

function inferReturnType(doc) {
  const tokens = [];

  for (const value of doc.returns ?? []) {
    tokens.push(...(value.type?.names ?? []));
    tokens.push(stripHtml(value.description) ?? '');
  }

  const text = tokens.join(' ').toLowerCase();
  if (/\bpattern\b/.test(text)) {
    return 'Pattern';
  }
  if (/\bnumber\b/.test(text)) {
    return 'Number';
  }
  if (/\bstring\b/.test(text)) {
    return 'String';
  }
  if (/\bboolean\b/.test(text)) {
    return 'Boolean';
  }
  if (/\barray\b/.test(text)) {
    return 'Array';
  }
  if (/\bobject\b/.test(text)) {
    return 'Object';
  }
  return 'Unknown';
}

function toSymbol(doc) {
  if (typeof doc.name !== 'string' || doc.name === '') {
    return undefined;
  }

  const symbol = {
    name: doc.name,
    longName: typeof doc.longname === 'string' ? doc.longname : doc.name,
    kind: normalizeKind(doc.kind),
    scope: normalizeScope(doc.scope),
    returnType: inferReturnType(doc),
    examples: Array.isArray(doc.examples) ? doc.examples : [],
    parameters: (doc.params ?? []).map((parameter) => {
      const entry = {
        types: parameter.type?.names ?? [],
      };
      const name = parameter.name;
      const description = stripHtml(parameter.description);
      if (typeof name === 'string' && name !== '') {
        entry.name = name;
      }
      if (description !== undefined) {
        entry.description = description;
      }
      return entry;
    }),
    returns: (doc.returns ?? []).map((value) => {
      const entry = {
        types: value.type?.names ?? [],
      };
      const description = stripHtml(value.description);
      if (description !== undefined) {
        entry.description = description;
      }
      return entry;
    }),
    synonyms: Array.isArray(doc.synonyms) ? [...doc.synonyms] : [],
  };

  const description = stripHtml(doc.description);
  if (description !== undefined) {
    symbol.description = description;
  }
  if (typeof doc.memberof === 'string' && doc.memberof !== '') {
    symbol.memberOf = doc.memberof;
  }
  if (doc.deprecated === true) {
    symbol.deprecated = true;
  }
  if (typeof doc.meta?.filename === 'string' && doc.meta.filename !== '') {
    symbol.sourceFile = doc.meta.filename;
  }
  if (Number.isInteger(doc.meta?.lineno)) {
    symbol.sourceLine = doc.meta.lineno;
  }

  return symbol;
}

function createSnapshot(sources) {
  const symbols = reference.docs
    .map(toSymbol)
    .filter((symbol) => symbol !== undefined)
    .sort(
      (left, right) =>
        compareStrings(left.longName, right.longName) || compareStrings(left.name, right.name),
    );

  return {
    schemaVersion: 1,
    id: 'strudel-1.2.6',
    strudelVersion: '1.2.6',
    sources,
    symbols,
  };
}

async function main() {
  const outputPath = parseOutputPath(process.argv.slice(2));
  const lock = readJson(join(repositoryRoot, 'package-lock.json'));
  const sources = verifyPinnedSources(lock);
  const snapshot = createSnapshot(sources);

  const source = `import type { GeneratedMetadataSnapshot } from './types.js';\n\nexport const generatedMetadata = ${JSON.stringify(
    snapshot,
    null,
    2,
  )} satisfies GeneratedMetadataSnapshot;\n`;
  const prettierConfig = (await resolveConfig(defaultOutput)) ?? {};
  const formatted = await format(source, {
    ...prettierConfig,
    filepath: defaultOutput,
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, formatted, 'utf8');
  console.log(`Generated ${outputPath} from ${snapshot.symbols.length} reference records`);
}

await main();
