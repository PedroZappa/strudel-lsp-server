import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createSemanticEngine,
  createStaticSemanticCatalog,
  findReferenceAt,
  findScopeAt,
  findSymbolAt,
  functionType,
  MINI_NOTATION_PATTERN_TYPE,
  patternMethodType,
  PATTERN_TYPE,
  resolveReference,
  SemanticAnalysisCancelledError,
  type SemanticDocument,
  type SemanticSymbol,
} from '../../src/semantic/index.js';
import type { FixtureNodeSpec } from './fixtures.js';
import { createFixtureDocument } from './fixtures.js';

const catalog = createStaticSemanticCatalog({
  version: 'fixture-1.2.6',
  globals: {
    s: {
      kind: 'function',
      type: functionType(PATTERN_TYPE),
      miniNotationArguments: [0],
    },
    note: {
      kind: 'function',
      type: functionType(PATTERN_TYPE),
      miniNotationArguments: [0],
    },
  },
  methods: {
    fast: { kind: 'method', type: patternMethodType(PATTERN_TYPE) },
    gain: { kind: 'method', type: patternMethodType(PATTERN_TYPE) },
  },
});

function symbolsNamed(document: SemanticDocument, name: string): SemanticSymbol[] {
  return [...document.symbols.values()].filter((symbol) => symbol.name === name);
}

function firstSymbol(document: SemanticDocument, name: string): SemanticSymbol {
  const symbol = symbolsNamed(document, name)[0];
  assert.ok(symbol !== undefined, `Expected symbol ${name}`);
  return symbol;
}

function chainedCallSpec(
  receiver: FixtureNodeSpec,
  method: string,
  argumentsText: string,
  callIndex: number,
): FixtureNodeSpec {
  return {
    kind: 'callExpression',
    text: `${receiver.text}.${method}${argumentsText}`,
    occurrence: callIndex,
    children: [
      {
        kind: 'memberExpression',
        text: `${receiver.text}.${method}`,
        occurrence: callIndex,
        children: [receiver, { kind: 'token', text: '.' }, { kind: 'identifier', text: method }],
      },
      {
        kind: 'arguments',
        text: argumentsText,
        children: [{ kind: 'number', text: argumentsText.slice(1, -1) }],
      },
    ],
  };
}

void test('builds parser-independent symbols, scopes, references and pattern types', () => {
  const text = 'const pat = s("bd sd").fast(2)\npat.gain(0.5)';
  const callS: FixtureNodeSpec = {
    kind: 'callExpression',
    text: 's("bd sd")',
    children: [
      { kind: 'identifier', text: 's', occurrence: 1 },
      {
        kind: 'arguments',
        text: '("bd sd")',
        children: [{ kind: 'string', text: '"bd sd"' }],
      },
    ],
  };
  const fastCall = chainedCallSpec(callS, 'fast', '(2)', 0);
  const patReference: FixtureNodeSpec = { kind: 'identifier', text: 'pat', occurrence: 1 };
  const gainCall: FixtureNodeSpec = {
    kind: 'callExpression',
    text: 'pat.gain(0.5)',
    children: [
      {
        kind: 'memberExpression',
        text: 'pat.gain',
        children: [
          patReference,
          { kind: 'token', text: '.' },
          { kind: 'identifier', text: 'gain' },
        ],
      },
      {
        kind: 'arguments',
        text: '(0.5)',
        children: [{ kind: 'number', text: '0.5' }],
      },
    ],
  };
  const { document } = createFixtureDocument(text, [
    {
      kind: 'variableDeclaration',
      text: 'const pat = s("bd sd").fast(2)',
      children: [
        { kind: 'token', text: 'const' },
        {
          kind: 'variableDeclarator',
          text: 'pat = s("bd sd").fast(2)',
          children: [
            { kind: 'identifier', text: 'pat', occurrence: 0 },
            { kind: 'token', text: '=' },
            fastCall,
          ],
        },
      ],
    },
    {
      kind: 'expressionStatement',
      text: 'pat.gain(0.5)',
      children: [gainCall],
    },
  ]);

  const result = createSemanticEngine(catalog).analyze(document);

  assert.equal(firstSymbol(result, 'pat').kind, 'variable');
  assert.equal(firstSymbol(result, 'pat').type.kind, 'Pattern');
  assert.equal(firstSymbol(result, 's').kind, 'builtin');
  assert.equal(firstSymbol(result, 's').type.kind, 'Function');
  assert.equal(firstSymbol(result, 's').type.returnType?.kind, 'Pattern');
  assert.equal(firstSymbol(result, 'fast').kind, 'method');
  assert.equal(firstSymbol(result, 'fast').type.kind, 'PatternMethod');
  assert.equal(firstSymbol(result, 'fast').type.returnType?.kind, 'Pattern');

  const callReference = result.references.find(
    (reference) => reference.name === 's' && reference.kind === 'call',
  );
  assert.ok(callReference !== undefined);
  assert.equal(resolveReference(result, callReference)?.name, 's');

  const gainReference = result.references.find(
    (reference) => reference.name === 'gain' && reference.kind === 'method',
  );
  assert.ok(gainReference !== undefined);
  assert.equal(resolveReference(result, gainReference)?.name, 'gain');

  const miniNotation = result.miniNotationArguments[0];
  assert.ok(miniNotation !== undefined);
  assert.equal(miniNotation.ownerName, 's');
  assert.equal(miniNotation.inferredType, MINI_NOTATION_PATTERN_TYPE);
  assert.equal(miniNotation.range.startOffset, text.indexOf('"bd sd"'));

  assert.equal(findSymbolAt(result, text.indexOf('const pat') + 6)?.name, 'pat');
  assert.equal(findReferenceAt(result, text.indexOf('pat.gain') + 1)?.name, 'pat');
});

void test('resolves user functions, parameters and lexical scopes', () => {
  const text = 'const x = 1\nfunction shape(x){ return note(x) }\nshape("c e")';
  const innerX: FixtureNodeSpec = { kind: 'identifier', text: 'x', occurrence: 2 };
  const { document } = createFixtureDocument(text, [
    {
      kind: 'variableDeclaration',
      text: 'const x = 1',
      children: [
        { kind: 'token', text: 'const' },
        {
          kind: 'variableDeclarator',
          text: 'x = 1',
          children: [
            { kind: 'identifier', text: 'x', occurrence: 0 },
            { kind: 'token', text: '=' },
            { kind: 'number', text: '1' },
          ],
        },
      ],
    },
    {
      kind: 'functionDeclaration',
      text: 'function shape(x){ return note(x) }',
      children: [
        { kind: 'token', text: 'function' },
        { kind: 'identifier', text: 'shape' },
        {
          kind: 'formalParameters',
          text: '(x)',
          children: [{ kind: 'identifier', text: 'x', occurrence: 1 }],
        },
        {
          kind: 'block',
          text: '{ return note(x) }',
          children: [
            {
              kind: 'returnStatement',
              text: 'return note(x)',
              children: [
                { kind: 'token', text: 'return' },
                {
                  kind: 'callExpression',
                  text: 'note(x)',
                  children: [
                    { kind: 'identifier', text: 'note' },
                    {
                      kind: 'arguments',
                      text: '(x)',
                      children: [innerX],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'expressionStatement',
      text: 'shape("c e")',
      children: [
        {
          kind: 'callExpression',
          text: 'shape("c e")',
          children: [
            { kind: 'identifier', text: 'shape' },
            {
              kind: 'arguments',
              text: '("c e")',
              children: [{ kind: 'string', text: '"c e"' }],
            },
          ],
        },
      ],
    },
  ]);

  const result = createSemanticEngine(catalog).analyze(document);
  const globalX = firstSymbol(result, 'x');
  const parameterX = symbolsNamed(result, 'x').find((symbol) => symbol.kind === 'parameter');
  assert.equal(globalX.type.kind, 'Number');
  assert.ok(parameterX !== undefined);

  const innerXOffset = text.indexOf('note(x)') + 5;
  const reference = findReferenceAt(result, innerXOffset);
  assert.ok(reference !== undefined);
  assert.equal(resolveReference(result, reference)?.id, parameterX.id);

  const shape = firstSymbol(result, 'shape');
  assert.equal(shape.kind, 'function');
  assert.equal(shape.type.kind, 'Function');
  assert.equal(shape.type.returnType?.kind, 'Pattern');

  const scope = findScopeAt(result, innerXOffset);
  assert.ok(scope !== undefined);
  assert.ok(scope.id.includes('function:shape'));
});

void test('resolves imported bindings through the injected catalog', () => {
  const text = 'import { note as n } from "@strudel/core"\nn("c")';
  const { document } = createFixtureDocument(text, [
    {
      kind: 'importDeclaration',
      text: 'import { note as n } from "@strudel/core"',
      children: [
        { kind: 'token', text: 'import' },
        {
          kind: 'namedImports',
          text: '{ note as n }',
          children: [
            {
              kind: 'importSpecifier',
              text: 'note as n',
              children: [
                { kind: 'identifier', text: 'note', occurrence: 0 },
                { kind: 'token', text: 'as' },
                { kind: 'identifier', text: 'n', occurrence: 1 },
              ],
            },
          ],
        },
        { kind: 'token', text: 'from' },
        { kind: 'string', text: '"@strudel/core"' },
      ],
    },
    {
      kind: 'expressionStatement',
      text: 'n("c")',
      children: [
        {
          kind: 'callExpression',
          text: 'n("c")',
          children: [
            { kind: 'identifier', text: 'n', occurrence: 2 },
            {
              kind: 'arguments',
              text: '("c")',
              children: [{ kind: 'string', text: '"c"' }],
            },
          ],
        },
      ],
    },
  ]);

  const result = createSemanticEngine(catalog).analyze(document);
  const imported = firstSymbol(result, 'n');
  assert.equal(imported.kind, 'import');
  assert.equal(imported.type.kind, 'Function');
  assert.equal(imported.type.returnType?.kind, 'Pattern');

  const reference = result.references.find((item) => item.name === 'n' && item.kind === 'call');
  assert.ok(reference !== undefined);
  assert.equal(resolveReference(result, reference)?.id, imported.id);
});

void test('recovers from incomplete calls and partial chains', () => {
  const text = 'note("c"';
  const { document } = createFixtureDocument(text, [
    {
      kind: 'expressionStatement',
      text,
      children: [
        {
          kind: 'error',
          text,
          isError: true,
          children: [
            { kind: 'identifier', text: 'note' },
            {
              kind: 'arguments',
              text: '("c"',
              children: [{ kind: 'string', text: '"c"' }],
            },
          ],
        },
      ],
    },
  ]);

  const result = createSemanticEngine(catalog).analyze(document);
  assert.equal(result.version, 1);
  assert.equal(result.symbols.size > 0, true);
  const note = result.references.find((reference) => reference.name === 'note');
  assert.ok(note !== undefined);
  assert.equal(resolveReference(result, note)?.kind, 'builtin');

  const partialChainText = 's("bd").';
  const partial = createFixtureDocument(partialChainText, [
    {
      kind: 'expressionStatement',
      text: partialChainText,
      children: [
        {
          kind: 'error',
          text: partialChainText,
          isError: true,
          children: [
            {
              kind: 'callExpression',
              text: 's("bd")',
              children: [
                { kind: 'identifier', text: 's', occurrence: 0 },
                {
                  kind: 'arguments',
                  text: '("bd")',
                  children: [{ kind: 'string', text: '"bd"' }],
                },
              ],
            },
            { kind: 'token', text: '.' },
          ],
        },
      ],
    },
  ]);

  assert.doesNotThrow(() => createSemanticEngine(catalog).analyze(partial.document));
});

void test('reuses unaffected statement analysis after a non-declaration edit', () => {
  const sharedChildren: FixtureNodeSpec[] = [
    {
      kind: 'variableDeclaration',
      text: 'const pat = s("bd")',
      children: [
        { kind: 'token', text: 'const' },
        {
          kind: 'variableDeclarator',
          text: 'pat = s("bd")',
          children: [
            { kind: 'identifier', text: 'pat', occurrence: 0 },
            { kind: 'token', text: '=' },
            {
              kind: 'callExpression',
              text: 's("bd")',
              children: [
                { kind: 'identifier', text: 's', occurrence: 1 },
                {
                  kind: 'arguments',
                  text: '("bd")',
                  children: [{ kind: 'string', text: '"bd"' }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'expressionStatement',
      text: 'pat.gain(0.5)',
      children: [
        {
          kind: 'callExpression',
          text: 'pat.gain(0.5)',
          children: [
            {
              kind: 'memberExpression',
              text: 'pat.gain',
              children: [
                { kind: 'identifier', text: 'pat', occurrence: 1 },
                { kind: 'token', text: '.' },
                { kind: 'identifier', text: 'gain' },
              ],
            },
            {
              kind: 'arguments',
              text: '(0.5)',
              children: [{ kind: 'number', text: '0.5' }],
            },
          ],
        },
      ],
    },
  ];

  const engine = createSemanticEngine(catalog);
  const firstText = 'const pat = s("bd")\npat.gain(0.5)';
  const secondText = '// edit\nconst pat = s("bd")\npat.gain(0.5)';
  const first = engine.analyze(createFixtureDocument(firstText, sharedChildren, 1).document);
  const second = engine.analyze(createFixtureDocument(secondText, sharedChildren, 2).document, {
    previous: first,
  });

  const firstPat = firstSymbol(first, 'pat');
  const secondPat = firstSymbol(second, 'pat');
  assert.equal(second.version, 2);
  assert.equal(secondPat.id, firstPat.id);
  assert.equal(secondPat.type, firstPat.type);
  assert.equal(secondPat.declaration?.startOffset, (firstPat.declaration?.startOffset ?? 0) + 8);

  const firstReference = first.references[0];
  const secondReference = second.references[0];
  assert.ok(firstReference !== undefined && secondReference !== undefined);
  assert.equal(secondReference.id, firstReference.id);
  assert.equal(secondReference.range.startOffset, firstReference.range.startOffset + 8);
});

void test('invalidates cached analysis when a global declaration changes', () => {
  const engine = createSemanticEngine(catalog);
  const firstText = 'const pat = s("bd")\npat.gain(0.5)';
  const first = engine.analyze(
    createFixtureDocument(firstText, [
      {
        kind: 'variableDeclaration',
        text: 'const pat = s("bd")',
        children: [
          {
            kind: 'variableDeclarator',
            text: 'pat = s("bd")',
            children: [
              { kind: 'identifier', text: 'pat', occurrence: 0 },
              {
                kind: 'callExpression',
                text: 's("bd")',
                children: [
                  { kind: 'identifier', text: 's', occurrence: 1 },
                  {
                    kind: 'arguments',
                    text: '("bd")',
                    children: [{ kind: 'string', text: '"bd"' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]).document,
  );

  const secondText = 'const pat = note("c")\npat.gain(0.5)';
  const second = engine.analyze(
    createFixtureDocument(secondText, [
      {
        kind: 'variableDeclaration',
        text: 'const pat = note("c")',
        children: [
          {
            kind: 'variableDeclarator',
            text: 'pat = note("c")',
            children: [
              { kind: 'identifier', text: 'pat', occurrence: 0 },
              {
                kind: 'callExpression',
                text: 'note("c")',
                children: [
                  { kind: 'identifier', text: 'note' },
                  {
                    kind: 'arguments',
                    text: '("c")',
                    children: [{ kind: 'string', text: '"c"' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]).document,
    { previous: first },
  );

  assert.notEqual(firstSymbol(second, 'pat').id, firstSymbol(first, 'pat').id);
});

void test('supports cancellation before and during analysis', () => {
  const { document } = createFixtureDocument('note("c")', [
    {
      kind: 'expressionStatement',
      text: 'note("c")',
      children: [
        {
          kind: 'callExpression',
          text: 'note("c")',
          children: [
            { kind: 'identifier', text: 'note' },
            {
              kind: 'arguments',
              text: '("c")',
              children: [{ kind: 'string', text: '"c"' }],
            },
          ],
        },
      ],
    },
  ]);
  const engine = createSemanticEngine(catalog);

  assert.throws(
    () => engine.analyze(document, { token: { isCancellationRequested: true } }),
    SemanticAnalysisCancelledError,
  );

  let checks = 0;
  const lateToken = {
    get isCancellationRequested(): boolean {
      checks += 1;
      return checks >= 2;
    },
  };
  assert.throws(
    () => engine.analyze(document, { token: lateToken }),
    SemanticAnalysisCancelledError,
  );
});
