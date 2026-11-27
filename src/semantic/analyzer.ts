import { performance } from 'node:perf_hooks';

import { recordCount, recordDuration } from '../performance/index.js';
import type { SyntaxDocument, SyntaxNode } from '../syntax/index.js';

import {
  createEmptySemanticCatalog,
  type SemanticCatalog,
  type SemanticCatalogEntry,
} from './catalog.js';
import { throwIfCancelled } from './cancellation.js';
import { PATTERN_TYPE } from './factories.js';
import {
  cloneStatementAnalysis,
  GLOBAL_SCOPE_ID,
  hashText,
  toSemanticRange,
  type DeclarationPlan,
  type DeclarationPlanKind,
  type EngineCache,
  type GlobalBinding,
  type MutableScope,
  type MutableSymbol,
  type StatementAnalysis,
} from './model.js';
import { StatementAnalyzer } from './statementAnalyzer.js';
import type {
  SemanticAnalysisOptions,
  SemanticDocument,
  SemanticReference,
  SemanticScope,
  SemanticSymbol,
} from './types.js';

function namedChildren(node: SyntaxNode): readonly SyntaxNode[] {
  return node.children.filter((child) => child.named);
}

function findNodes(node: SyntaxNode, kind: SyntaxNode['kind']): SyntaxNode[] {
  const matches = node.kind === kind ? [node] : [];
  for (const child of node.children) {
    matches.push(...findNodes(child, kind));
  }
  return matches;
}

function unwrapExport(node: SyntaxNode): SyntaxNode {
  if (node.kind !== 'exportDeclaration') {
    return node;
  }
  return namedChildren(node).find((child) => child.kind !== 'token') ?? node;
}

export function topLevelStatements(root: SyntaxNode): readonly SyntaxNode[] {
  return root.children.filter(
    (child) => child.named && child.kind !== 'token' && child.kind !== 'comment',
  );
}

function statementKeys(statements: readonly SyntaxNode[]): string[] {
  const occurrences = new Map<string, number>();
  return statements.map((statement) => {
    const base = `stmt:${hashText(statement.text)}`;
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return `${base}:${occurrence}`;
  });
}

function statementRange(text: string, statement: SyntaxNode) {
  return toSemanticRange(text, statement.range);
}

function collectDeclarationPlans(
  statements: readonly SyntaxNode[],
  text: string,
): DeclarationPlan[] {
  const plans: DeclarationPlan[] = [];

  statements.forEach((statement, statementIndex) => {
    const target = unwrapExport(statement);
    const addPlan = (
      kind: DeclarationPlanKind,
      name: string,
      rangeNode: SyntaxNode,
      node: SyntaxNode,
    ): void => {
      // Keep global identity independent of statement text. An initializer edit
      // changes the statement key and forces that declaration to reanalyze, but
      // references in unchanged statements must continue to resolve to it.
      plans.push({
        kind,
        name,
        symbolId: `symbol:global:${statementIndex}:${kind}:${plans.length}:${name}`,
        statementIndex,
        range: toSemanticRange(text, rangeNode.range),
        node,
      });
    };

    if (target.kind === 'variableDeclaration') {
      for (const declarator of namedChildren(target)) {
        if (declarator.kind !== 'variableDeclarator') {
          continue;
        }
        const name = namedChildren(declarator).find((child) => child.kind === 'identifier');
        if (name !== undefined) {
          addPlan('variable', name.text, name, declarator);
        }
      }
      return;
    }

    if (target.kind === 'functionDeclaration') {
      const name = namedChildren(target).find((child) => child.kind === 'identifier');
      if (name !== undefined) {
        addPlan('function', name.text, name, target);
      }
      return;
    }

    if (target.kind === 'importDeclaration') {
      for (const specifier of findNodes(target, 'importSpecifier')) {
        const identifiers = findNodes(specifier, 'identifier');
        const localName = identifiers[identifiers.length - 1];
        if (localName !== undefined) {
          addPlan('import', localName.text, localName, specifier);
        }
      }
      return;
    }

    const assignment = findNodes(target, 'assignmentExpression')[0];
    if (assignment !== undefined) {
      const left = namedChildren(assignment)[0];
      if (left?.kind === 'identifier') {
        addPlan('assignment', left.text, left, assignment);
      }
    }
  });

  return plans;
}

function globalSignature(catalog: SemanticCatalog, plans: readonly DeclarationPlan[]): string {
  // Declaration identity and order determine whether unchanged statements can
  // safely be reused. Initializer text is excluded because the changed
  // declaration's own statement key is sufficient to force its reanalysis.
  return JSON.stringify({
    catalogVersion: catalog.version,
    declarations: plans.map((plan) => plan.symbolId),
  });
}

function createAnalysis(statement: SyntaxNode, key: string, text: string): StatementAnalysis {
  return {
    key,
    sourceText: statement.text,
    sourceRange: statementRange(text, statement),
    scopes: [],
    symbols: [],
    references: [],
    miniNotationArguments: [],
  };
}

function catalogEntryForSymbol(
  symbol: MutableSymbol,
  catalog: SemanticCatalog,
): SemanticCatalogEntry | undefined {
  switch (symbol.kind) {
    case 'builtin':
      return catalog.getGlobal(symbol.name);
    case 'method':
      return catalog.getMethod(symbol.name, PATTERN_TYPE);
    case 'sample':
      return catalog.getSample(symbol.name);
    default:
      return undefined;
  }
}

function semanticValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function finalizeDocument(
  syntax: SyntaxDocument,
  analyses: readonly StatementAnalysis[],
  globalScope: MutableScope,
): SemanticDocument {
  const mutableScopes = new Map<string, MutableScope>([[GLOBAL_SCOPE_ID, globalScope]]);
  const mutableSymbols = new Map<string, MutableSymbol>();
  const references: SemanticReference[] = [];

  for (const analysis of analyses) {
    for (const scope of analysis.scopes) {
      mutableScopes.set(scope.id, scope);
    }
    for (const symbol of analysis.symbols) {
      mutableSymbols.set(symbol.id, symbol);
    }
    for (const reference of analysis.references) {
      references.push(reference);
    }
  }

  for (const symbol of mutableSymbols.values()) {
    if (symbol.scopeId === GLOBAL_SCOPE_ID && !globalScope.symbolIds.includes(symbol.id)) {
      globalScope.symbolIds.push(symbol.id);
    }
  }
  for (const scope of mutableScopes.values()) {
    if (scope.id !== GLOBAL_SCOPE_ID && scope.parentId === GLOBAL_SCOPE_ID) {
      globalScope.childIds.push(scope.id);
    }
  }

  const scopes = new Map<string, SemanticScope>();
  for (const [id, scope] of mutableScopes) {
    scopes.set(id, {
      id: scope.id,
      kind: scope.kind,
      range: scope.range,
      parentId: scope.parentId,
      symbolIds: [...scope.symbolIds],
      childIds: [...scope.childIds],
    });
  }

  const symbols = new Map<string, SemanticSymbol>();
  for (const [id, symbol] of mutableSymbols) {
    symbols.set(id, {
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      type: symbol.type,
      declaration: symbol.declaration,
      scopeId: symbol.scopeId,
      signature: symbol.signature,
    });
  }

  return {
    uri: syntax.uri,
    version: syntax.version,
    rootScopeId: GLOBAL_SCOPE_ID,
    scopes,
    symbols,
    references,
    miniNotationArguments: analyses.flatMap((analysis) => analysis.miniNotationArguments),
  };
}

export class SemanticEngine {
  private readonly caches = new WeakMap<SemanticDocument, EngineCache>();

  constructor(private readonly catalog: SemanticCatalog = createEmptySemanticCatalog()) {}

  analyze(syntax: SyntaxDocument, options: SemanticAnalysisOptions = {}): SemanticDocument {
    throwIfCancelled(options.token);

    const startedAt = options.timing === undefined ? undefined : performance.now();
    const statements = topLevelStatements(syntax.root);
    const keys = statementKeys(statements);
    const plans = collectDeclarationPlans(statements, syntax.text);
    const signature = globalSignature(this.catalog, plans);
    const previousCache =
      options.previous === undefined ? undefined : this.caches.get(options.previous);
    const plansByStatement = new Map<number, DeclarationPlan[]>();
    for (const plan of plans) {
      const existing = plansByStatement.get(plan.statementIndex) ?? [];
      existing.push(plan);
      plansByStatement.set(plan.statementIndex, existing);
    }

    const canReuse =
      previousCache?.globalSignature === signature &&
      previousCache.statementKeys.length === keys.length &&
      this.preservesGlobalSymbolSemantics(
        syntax,
        statements,
        keys,
        plans,
        plansByStatement,
        previousCache,
        options,
      );

    const initialSymbols = new Map<string, MutableSymbol>();
    for (const plan of plans) {
      if (!initialSymbols.has(plan.symbolId)) {
        initialSymbols.set(plan.symbolId, {
          id: plan.symbolId,
          name: plan.name,
          kind: this.symbolKindForPlan(plan.kind),
          type: { kind: 'Unknown' },
          declaration: plan.range,
          scopeId: GLOBAL_SCOPE_ID,
        });
      }
    }

    const analyses: (StatementAnalysis | undefined)[] = [];
    let reusedStatements = 0;
    let analyzedStatements = 0;
    statements.forEach((statement, index) => {
      throwIfCancelled(options.token);
      if (canReuse && previousCache?.statementKeys[index] === keys[index]) {
        const cached = previousCache.analyses[index];
        if (cached?.sourceText === statement.text) {
          const sourceRange = statementRange(syntax.text, statement);
          // An unchanged range needs no cloned tree: reused analyses are never
          // mutated after publication. Shifted statements still need fresh
          // ranges for symbols, references and mini-notation facts.
          analyses.push(
            cached.sourceRange.startOffset === sourceRange.startOffset
              ? cached
              : cloneStatementAnalysis(cached, syntax.text, sourceRange),
          );
          reusedStatements += 1;
          return;
        }
      }
      analyses.push(createAnalysis(statement, keys[index] ?? '', syntax.text));
      analyzedStatements += 1;
    });

    const symbolsById = new Map(initialSymbols);
    for (const analysis of analyses) {
      for (const symbol of analysis?.symbols ?? []) {
        symbolsById.set(symbol.id, symbol);
      }
    }

    const globalBindings = new Map<string, GlobalBinding>();
    for (const plan of plans) {
      const symbol = symbolsById.get(plan.symbolId);
      if (symbol !== undefined) {
        globalBindings.set(plan.name, { plan, symbol });
      }
    }

    const globalScope: MutableScope = {
      id: GLOBAL_SCOPE_ID,
      kind: 'global',
      range: toSemanticRange(syntax.text, syntax.root.range),
      symbolIds: [],
      childIds: [],
    };
    const scopesById = new Map<string, MutableScope>([[GLOBAL_SCOPE_ID, globalScope]]);
    for (const analysis of analyses) {
      for (const scope of analysis?.scopes ?? []) {
        scopesById.set(scope.id, scope);
      }
    }

    const catalogEntriesById = new Map<string, SemanticCatalogEntry>();
    for (const symbol of symbolsById.values()) {
      const entry = catalogEntryForSymbol(symbol, this.catalog);
      if (entry !== undefined) {
        catalogEntriesById.set(symbol.id, entry);
      }
    }

    statements.forEach((statement, index) => {
      throwIfCancelled(options.token);
      const analysis = analyses[index];
      if (analysis === undefined || this.hasAnalysisContent(analysis)) {
        return;
      }

      new StatementAnalyzer({
        statement,
        key: keys[index] ?? '',
        text: syntax.text,
        analysis,
        plansForStatement: plansByStatement.get(index) ?? [],
        globalBindings,
        symbolsById,
        scopesById,
        catalogEntriesById,
        catalog: this.catalog,
        token: options.token,
      }).analyze();
    });

    const completed = this.completeAnalyses(analyses);
    throwIfCancelled(options.token);

    const document = finalizeDocument(syntax, completed, globalScope);
    this.caches.set(document, {
      globalSignature: signature,
      statementKeys: keys,
      analyses: completed,
    });
    recordCount(options.timing, 'semantic.statements.reused', reusedStatements, {
      version: syntax.version,
    });
    recordCount(options.timing, 'semantic.statements.analyzed', analyzedStatements, {
      version: syntax.version,
    });
    if (startedAt !== undefined) {
      recordDuration(options.timing, 'semantic.analyze', startedAt, {
        version: syntax.version,
        statements: statements.length,
      });
    }
    return document;
  }

  /**
   * An unchanged statement can only be reused if the global declarations it may
   * reference still have the same semantics. A changed initializer is analysed
   * once in isolation; any inferred-type or signature change forces a rebuild
   * so reused statements cannot keep types derived from the old declaration.
   */
  private preservesGlobalSymbolSemantics(
    syntax: SyntaxDocument,
    statements: readonly SyntaxNode[],
    keys: readonly string[],
    plans: readonly DeclarationPlan[],
    plansByStatement: ReadonlyMap<number, DeclarationPlan[]>,
    previousCache: EngineCache | undefined,
    options: SemanticAnalysisOptions,
  ): boolean {
    if (options.previous === undefined || previousCache === undefined) {
      return true;
    }

    const changedIndexes = [
      ...new Set(
        plans
          .filter(
            (plan) =>
              previousCache.statementKeys[plan.statementIndex] !== keys[plan.statementIndex],
          )
          .map((plan) => plan.statementIndex),
      ),
    ];
    if (changedIndexes.length === 0) {
      return true;
    }
    if (changedIndexes.length > 1) {
      return false;
    }

    const index = changedIndexes[0];
    const statement = statements[index];
    if (statement === undefined) {
      return false;
    }

    const symbolsById = new Map<string, MutableSymbol>();
    for (const symbol of options.previous.symbols.values()) {
      symbolsById.set(symbol.id, { ...symbol });
    }
    const scopesById = new Map<string, MutableScope>();
    for (const scope of options.previous.scopes.values()) {
      scopesById.set(scope.id, {
        id: scope.id,
        kind: scope.kind,
        range: scope.range,
        parentId: scope.parentId,
        symbolIds: [...scope.symbolIds],
        childIds: [...scope.childIds],
      });
    }
    if (!scopesById.has(GLOBAL_SCOPE_ID)) {
      scopesById.set(GLOBAL_SCOPE_ID, {
        id: GLOBAL_SCOPE_ID,
        kind: 'global',
        range: toSemanticRange(syntax.text, syntax.root.range),
        symbolIds: [],
        childIds: [],
      });
    }

    const changedPlans = plansByStatement.get(index) ?? [];
    for (const plan of changedPlans) {
      symbolsById.set(plan.symbolId, {
        id: plan.symbolId,
        name: plan.name,
        kind: this.symbolKindForPlan(plan.kind),
        type: { kind: 'Unknown' },
        declaration: plan.range,
        scopeId: GLOBAL_SCOPE_ID,
      });
    }

    const globalBindings = new Map<string, GlobalBinding>();
    for (const plan of plans) {
      const symbol = symbolsById.get(plan.symbolId);
      if (symbol !== undefined) {
        globalBindings.set(plan.name, { plan, symbol });
      }
    }
    const catalogEntriesById = new Map<string, SemanticCatalogEntry>();
    for (const symbol of symbolsById.values()) {
      const entry = catalogEntryForSymbol(symbol, this.catalog);
      if (entry !== undefined) {
        catalogEntriesById.set(symbol.id, entry);
      }
    }

    throwIfCancelled(options.token);
    new StatementAnalyzer({
      statement,
      key: keys[index] ?? '',
      text: syntax.text,
      analysis: createAnalysis(statement, keys[index] ?? '', syntax.text),
      plansForStatement: changedPlans,
      globalBindings,
      symbolsById,
      scopesById,
      catalogEntriesById,
      catalog: this.catalog,
      token: options.token,
    }).analyze();
    throwIfCancelled(options.token);

    for (const plan of changedPlans) {
      const current = symbolsById.get(plan.symbolId);
      const previous = options.previous.symbols.get(plan.symbolId);
      if (
        current === undefined ||
        previous === undefined ||
        !semanticValuesEqual(current.type, previous.type) ||
        !semanticValuesEqual(current.signature, previous.signature)
      ) {
        return false;
      }
    }
    return true;
  }

  private symbolKindForPlan(kind: DeclarationPlanKind): MutableSymbol['kind'] {
    switch (kind) {
      case 'function':
        return 'function';
      case 'import':
        return 'import';
      case 'assignment':
      case 'variable':
        return 'variable';
    }
  }

  private hasAnalysisContent(analysis: StatementAnalysis): boolean {
    return (
      analysis.scopes.length > 0 ||
      analysis.symbols.length > 0 ||
      analysis.references.length > 0 ||
      analysis.miniNotationArguments.length > 0
    );
  }

  private completeAnalyses(
    analyses: readonly (StatementAnalysis | undefined)[],
  ): StatementAnalysis[] {
    const completed: StatementAnalysis[] = [];
    for (const analysis of analyses) {
      if (analysis === undefined) {
        throw new Error('Semantic analysis was left incomplete');
      }
      completed.push(analysis);
    }
    return completed;
  }
}

export function createSemanticEngine(
  catalog: SemanticCatalog = createEmptySemanticCatalog(),
): SemanticEngine {
  return new SemanticEngine(catalog);
}
