import { analyzeMiniNotation, type MiniNotationAnalysis } from '../miniNotation/index.js';
import type { SyntaxNode, SyntaxRange } from '../syntax/index.js';

import type { SemanticCatalog, SemanticCatalogEntry } from './catalog.js';
import { throwIfCancelled } from './cancellation.js';
import {
  ARRAY_TYPE,
  functionType,
  MINI_NOTATION_PATTERN_TYPE,
  NUMBER_TYPE,
  OBJECT_TYPE,
  PATTERN_TYPE,
  STRING_TYPE,
  UNKNOWN_TYPE,
} from './factories.js';
import {
  combineReturnTypes,
  GLOBAL_SCOPE_ID,
  toSemanticRange,
  type DeclarationPlan,
  type GlobalBinding,
  type MutableScope,
  type MutableSymbol,
  type StatementAnalysis,
} from './model.js';
import type {
  SemanticCancellationToken,
  SemanticRange,
  SemanticReferenceKind,
  SemanticScopeKind,
  SemanticSignature,
  SemanticSignatureParameter,
  SemanticSymbolKind,
  StrudelType,
} from './types.js';

export interface StatementAnalyzerOptions {
  readonly statement: SyntaxNode;
  readonly key: string;
  readonly text: string;
  readonly analysis: StatementAnalysis;
  readonly plansForStatement: readonly DeclarationPlan[];
  readonly globalBindings: ReadonlyMap<string, GlobalBinding>;
  readonly symbolsById: Map<string, MutableSymbol>;
  readonly scopesById: Map<string, MutableScope>;
  readonly catalogEntriesById: Map<string, SemanticCatalogEntry>;
  readonly catalog: SemanticCatalog;
  readonly token?: SemanticCancellationToken;
}

interface CalleeInfo {
  readonly type: StrudelType;
  readonly entry?: SemanticCatalogEntry;
  readonly ownerName: string;
}

interface MemberInfo {
  readonly type: StrudelType;
  readonly entry?: SemanticCatalogEntry;
  readonly propertyName?: string;
}

interface ParameterDescriptor {
  readonly node: SyntaxNode;
  readonly nameNode: SyntaxNode;
  readonly name: string;
  readonly optional: boolean;
  readonly rest: boolean;
}

const AMBIGUOUS_JS_METHOD_NAMES = new Set([
  'at',
  'catch',
  'charAt',
  'concat',
  'constructor',
  'endsWith',
  'entries',
  'every',
  'fill',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'forEach',
  'has',
  'includes',
  'indexOf',
  'join',
  'keys',
  'lastIndexOf',
  'map',
  'pop',
  'push',
  'reduce',
  'reduceRight',
  'reverse',
  'shift',
  'slice',
  'some',
  'sort',
  'split',
  'startsWith',
  'then',
  'toLocaleString',
  'toLowerCase',
  'toString',
  'toUpperCase',
  'trim',
  'valueOf',
  'values',
]);

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

function isMiniNotationString(node: SyntaxNode): boolean {
  if (node.kind === 'templateString') {
    return true;
  }
  return node.kind === 'string' && node.text.startsWith('"');
}

function sameTypeKind(left: StrudelType, right: StrudelType): boolean {
  return left.kind === right.kind;
}

function parameterDescriptors(node: SyntaxNode): readonly ParameterDescriptor[] {
  const descriptors: ParameterDescriptor[] = [];
  for (const parameter of namedChildren(node)) {
    if (parameter.kind === 'identifier') {
      descriptors.push({
        node: parameter,
        nameNode: parameter,
        name: parameter.text,
        optional: false,
        rest: false,
      });
      continue;
    }
    if (parameter.kind === 'assignmentPattern') {
      const nameNode = namedChildren(parameter).find((child) => child.kind === 'identifier');
      if (nameNode !== undefined) {
        descriptors.push({
          node: parameter,
          nameNode,
          name: nameNode.text,
          optional: true,
          rest: false,
        });
      }
      continue;
    }
    if (parameter.kind === 'spreadElement') {
      const nameNode = namedChildren(parameter).find((child) => child.kind === 'identifier');
      if (nameNode !== undefined) {
        descriptors.push({
          node: parameter,
          nameNode,
          name: nameNode.text,
          optional: false,
          rest: true,
        });
      }
      continue;
    }
    if (parameter.kind === 'error' && parameter.text.startsWith('...')) {
      const nameNode = namedChildren(parameter).at(-1);
      if (nameNode !== undefined && /^[A-Za-z_$][\w$]*$/.test(nameNode.text)) {
        descriptors.push({
          node: parameter,
          nameNode,
          name: nameNode.text,
          optional: false,
          rest: true,
        });
      }
    }
  }
  return descriptors;
}

function signatureForParameters(
  name: string,
  descriptors: readonly ParameterDescriptor[],
  types: readonly StrudelType[],
  source: SemanticSignature['source'],
): SemanticSignature {
  const parameters: SemanticSignatureParameter[] = descriptors.map((descriptor, index) => {
    const prefix = descriptor.rest ? '...' : '';
    const suffix = descriptor.optional ? '?' : '';
    const label = `${prefix}${descriptor.name}${suffix}: ${types[index]?.kind ?? 'Unknown'}`;
    return { label, optional: descriptor.optional, rest: descriptor.rest };
  });
  const prefix = name === '' ? '' : `${name}`;
  return {
    label: `${prefix}(${parameters.map((parameter) => parameter.label).join(', ')})`,
    parameters,
    source,
  };
}

export class StatementAnalyzer {
  private readonly statement: SyntaxNode;
  private readonly key: string;
  private readonly text: string;
  private readonly analysis: StatementAnalysis;
  private readonly plansForStatement: readonly DeclarationPlan[];
  private readonly globalBindings: ReadonlyMap<string, GlobalBinding>;
  private readonly symbolsById: Map<string, MutableSymbol>;
  private readonly scopesById: Map<string, MutableScope>;
  private readonly catalogEntriesById: Map<string, SemanticCatalogEntry>;
  private readonly catalog: SemanticCatalog;
  private readonly token?: SemanticCancellationToken;
  private localCounter = 0;

  constructor(options: StatementAnalyzerOptions) {
    this.statement = options.statement;
    this.key = options.key;
    this.text = options.text;
    this.analysis = options.analysis;
    this.plansForStatement = options.plansForStatement;
    this.globalBindings = options.globalBindings;
    this.symbolsById = options.symbolsById;
    this.scopesById = options.scopesById;
    this.catalogEntriesById = options.catalogEntriesById;
    this.catalog = options.catalog;
    this.token = options.token;
  }

  analyze(): void {
    throwIfCancelled(this.token);
    this.addPlannedSymbolsToAnalysis();

    for (const plan of this.plansForStatement) {
      throwIfCancelled(this.token);
      switch (plan.kind) {
        case 'variable':
          this.analyzeVariablePlan(plan);
          break;
        case 'function':
          this.analyzeFunctionNode(plan.node, plan.symbolId, GLOBAL_SCOPE_ID);
          break;
        case 'import':
          this.analyzeImportPlan(plan);
          break;
        case 'activePattern': {
          const symbol = this.symbolsById.get(plan.symbolId);
          if (symbol !== undefined) {
            symbol.type = this.inferExpression(plan.node, GLOBAL_SCOPE_ID);
          }
          break;
        }
        case 'assignment': {
          const symbol = this.symbolsById.get(plan.symbolId);
          if (symbol !== undefined) {
            symbol.type = this.inferExpression(plan.node, GLOBAL_SCOPE_ID);
          }
          break;
        }
      }
    }

    if (this.plansForStatement.length === 0) {
      this.inferExpression(unwrapExport(this.statement), GLOBAL_SCOPE_ID);
    }
  }

  private addPlannedSymbolsToAnalysis(): void {
    for (const plan of this.plansForStatement) {
      const symbol = this.symbolsById.get(plan.symbolId);
      if (symbol !== undefined) {
        this.analysis.symbols.push(symbol);
      }
    }
  }

  private analyzeVariablePlan(plan: DeclarationPlan): void {
    const symbol = this.symbolsById.get(plan.symbolId);
    if (symbol === undefined) {
      return;
    }

    const initializer = namedChildren(plan.node).find((child) => child.kind !== 'identifier');
    symbol.type =
      initializer === undefined ? UNKNOWN_TYPE : this.inferExpression(initializer, GLOBAL_SCOPE_ID);
  }

  private analyzeImportPlan(plan: DeclarationPlan): void {
    const symbol = this.symbolsById.get(plan.symbolId);
    if (symbol === undefined) {
      return;
    }

    const identifiers = findNodes(plan.node, 'identifier');
    const importedName = identifiers[0]?.text ?? plan.name;
    const entry = this.catalog.getGlobal(importedName);
    if (entry === undefined) {
      symbol.type = UNKNOWN_TYPE;
      return;
    }

    symbol.type = entry.type;
    this.catalogEntriesById.set(symbol.id, entry);
  }

  private analyzeFunctionNode(
    node: SyntaxNode,
    symbolId: string,
    parentScopeId: string,
  ): StrudelType {
    throwIfCancelled(this.token);
    const symbol = this.symbolsById.get(symbolId);
    if (symbol === undefined) {
      return UNKNOWN_TYPE;
    }

    const scope = this.createScope(
      'function',
      toSemanticRange(this.text, node.range),
      parentScopeId,
      `function:${symbol.name}`,
    );

    const parameters = namedChildren(node).find((child) => child.kind === 'formalParameters');
    const body = namedChildren(node).find((child) => child.kind === 'block');
    const descriptors = parameters === undefined ? [] : parameterDescriptors(parameters);
    const inferredTypes = this.inferParameterTypesFromUsage(
      body,
      descriptors.map((descriptor) => descriptor.name),
    );
    const parameterSymbols = descriptors.map((descriptor) =>
      this.declare(
        descriptor.name,
        'parameter',
        inferredTypes.get(descriptor.name) ?? UNKNOWN_TYPE,
        toSemanticRange(this.text, descriptor.nameNode.range),
        scope.id,
      ),
    );

    const returnTypes: StrudelType[] = [];
    if (body !== undefined) {
      for (const child of namedChildren(body)) {
        const returnType = this.analyzeBodyNode(child, scope.id);
        if (returnType !== undefined) {
          returnTypes.push(returnType);
        }
      }
    }

    const signature = signatureForParameters(
      symbol.name,
      descriptors,
      parameterSymbols.map((parameterSymbol) => parameterSymbol.type),
      'user',
    );
    symbol.type = functionType(combineReturnTypes(returnTypes), signature);
    symbol.signature = signature;
    return symbol.type;
  }

  private inferParameterTypesFromUsage(
    body: SyntaxNode | undefined,
    parameterNames: readonly string[],
  ): ReadonlyMap<string, StrudelType> {
    const evidence = new Map<string, Set<string>>();
    const names = new Set(parameterNames);
    if (body === undefined || names.size === 0) {
      return new Map<string, StrudelType>();
    }

    const visit = (node: SyntaxNode): void => {
      if (node.kind === 'functionDeclaration' || node.kind === 'arrowFunction') {
        return;
      }
      if (node.kind === 'memberExpression') {
        const named = namedChildren(node);
        const receiver = named[0];
        const property = named.find((child, index) => child.kind === 'identifier' && index > 0);
        if (receiver?.kind === 'identifier' && names.has(receiver.text) && property !== undefined) {
          const isPatternEvidence =
            !AMBIGUOUS_JS_METHOD_NAMES.has(property.text) &&
            this.catalog.getMethod(property.text, PATTERN_TYPE) !== undefined;
          const kinds = evidence.get(receiver.text) ?? new Set<string>();
          kinds.add(isPatternEvidence ? 'Pattern' : 'Conflicting');
          evidence.set(receiver.text, kinds);
        }
      }
      for (const child of node.children) {
        visit(child);
      }
    };
    visit(body);

    const inferred = new Map<string, StrudelType>();
    for (const [name, kinds] of evidence) {
      if (kinds.size === 1 && kinds.has('Pattern')) {
        inferred.set(name, PATTERN_TYPE);
      }
    }
    return inferred;
  }

  private analyzeBodyNode(node: SyntaxNode, scopeId: string): StrudelType | undefined {
    throwIfCancelled(this.token);

    if (node.kind === 'returnStatement') {
      const expression = namedChildren(node)[0];
      return expression === undefined ? undefined : this.inferExpression(expression, scopeId);
    }

    if (node.kind === 'block') {
      const blockScope = this.createScope(
        'block',
        toSemanticRange(this.text, node.range),
        scopeId,
        'block',
      );
      const returnTypes: StrudelType[] = [];
      for (const child of namedChildren(node)) {
        const returnType = this.analyzeBodyNode(child, blockScope.id);
        if (returnType !== undefined) {
          returnTypes.push(returnType);
        }
      }
      return combineReturnTypes(returnTypes);
    }

    if (node.kind === 'variableDeclaration') {
      this.analyzeLocalVariableDeclaration(node, scopeId);
      return undefined;
    }

    if (node.kind === 'functionDeclaration') {
      const name = namedChildren(node).find((child) => child.kind === 'identifier');
      if (name !== undefined) {
        const symbol = this.declare(
          name.text,
          'function',
          UNKNOWN_TYPE,
          toSemanticRange(this.text, name.range),
          scopeId,
        );
        this.analyzeFunctionNode(node, symbol.id, scopeId);
      }
      return undefined;
    }

    this.inferExpression(node, scopeId);
    return undefined;
  }

  private analyzeLocalVariableDeclaration(node: SyntaxNode, scopeId: string): void {
    for (const declarator of namedChildren(node)) {
      if (declarator.kind !== 'variableDeclarator') {
        continue;
      }
      const name = namedChildren(declarator).find((child) => child.kind === 'identifier');
      if (name === undefined) {
        continue;
      }
      const initializer = namedChildren(declarator).find((child) => child.kind !== 'identifier');
      const type =
        initializer === undefined ? UNKNOWN_TYPE : this.inferExpression(initializer, scopeId);
      this.declare(name.text, 'variable', type, toSemanticRange(this.text, name.range), scopeId);
    }
  }

  private createScope(
    kind: SemanticScopeKind,
    range: SemanticRange,
    parentId: string,
    hint: string,
  ): MutableScope {
    this.localCounter += 1;
    const scope: MutableScope = {
      id: `${this.key}:scope:${hint}:${this.localCounter}`,
      kind,
      range,
      parentId,
      symbolIds: [],
      childIds: [],
    };
    this.analysis.scopes.push(scope);
    this.scopesById.set(scope.id, scope);
    const parent = this.scopesById.get(parentId);
    if (parent !== undefined) {
      parent.childIds.push(scope.id);
    }
    return scope;
  }

  private declare(
    name: string,
    kind: SemanticSymbolKind,
    type: StrudelType,
    declaration: SemanticRange,
    scopeId: string,
  ): MutableSymbol {
    this.localCounter += 1;
    const symbol: MutableSymbol = {
      id: `${this.key}:symbol:local:${this.localCounter}`,
      name,
      kind,
      type,
      declaration,
      scopeId,
    };
    this.symbolsById.set(symbol.id, symbol);
    this.analysis.symbols.push(symbol);
    const scope = this.scopesById.get(scopeId);
    if (scope !== undefined) {
      scope.symbolIds.push(symbol.id);
    }
    return symbol;
  }

  private resolveName(name: string, scopeId: string): MutableSymbol | undefined {
    let scope = this.scopesById.get(scopeId);
    while (scope !== undefined) {
      for (const symbolId of scope.symbolIds) {
        const symbol = this.symbolsById.get(symbolId);
        if (symbol?.name === name) {
          return symbol;
        }
      }
      scope = scope.parentId === undefined ? undefined : this.scopesById.get(scope.parentId);
    }

    const binding = this.globalBindings.get(name);
    if (binding !== undefined) {
      return binding.symbol;
    }

    const entry = this.catalog.getGlobal(name);
    return entry === undefined ? undefined : this.ensureBuiltin(name, 'builtin', entry);
  }

  private ensureBuiltin(
    name: string,
    kind: SemanticSymbolKind,
    entry: SemanticCatalogEntry,
  ): MutableSymbol {
    const id = `builtin:${kind}:${name}`;
    const existing = this.symbolsById.get(id);
    if (existing !== undefined) {
      return existing;
    }

    const symbol: MutableSymbol = {
      id,
      name,
      kind,
      type: entry.type,
      scopeId: GLOBAL_SCOPE_ID,
      signature: entry.signatures?.[0],
    };
    this.symbolsById.set(id, symbol);
    this.analysis.symbols.push(symbol);
    this.catalogEntriesById.set(id, entry);
    return symbol;
  }

  private createReference(
    name: string,
    kind: SemanticReferenceKind,
    node: SyntaxNode,
    scopeId: string,
    symbol?: MutableSymbol,
    range: SyntaxRange = node.range,
  ): void {
    this.localCounter += 1;
    if (symbol?.scopeId === GLOBAL_SCOPE_ID) {
      const globalScope = this.scopesById.get(GLOBAL_SCOPE_ID);
      if (globalScope !== undefined && !globalScope.symbolIds.includes(symbol.id)) {
        globalScope.symbolIds.push(symbol.id);
      }
    }

    this.analysis.references.push({
      id: `${this.key}:ref:${this.localCounter}`,
      name,
      kind,
      range: toSemanticRange(this.text, range),
      scopeId,
      resolvedSymbolId: symbol?.id,
    });
  }

  private inferExpression(node: SyntaxNode, scopeId: string): StrudelType {
    throwIfCancelled(this.token);

    switch (node.kind) {
      case 'identifier': {
        const symbol = this.resolveName(node.text, scopeId);
        this.createReference(node.text, 'value', node, scopeId, symbol);
        return symbol?.type ?? UNKNOWN_TYPE;
      }
      case 'number':
        return NUMBER_TYPE;
      case 'string':
      case 'templateString': {
        for (const child of namedChildren(node)) {
          if (child.kind === 'templateSubstitution') {
            this.inferExpression(child, scopeId);
          }
        }
        return STRING_TYPE;
      }
      case 'array': {
        for (const child of namedChildren(node)) {
          this.inferExpression(child, scopeId);
        }
        return ARRAY_TYPE;
      }
      case 'object': {
        for (const child of namedChildren(node)) {
          this.inferExpression(child, scopeId);
        }
        return OBJECT_TYPE;
      }
      case 'pair': {
        const named = namedChildren(node);
        const value = named[named.length - 1];
        return value === undefined ? UNKNOWN_TYPE : this.inferExpression(value, scopeId);
      }
      case 'callExpression':
        return this.inferCall(node, scopeId);
      case 'memberExpression':
        return this.inferMemberExpression(node, scopeId).type;
      case 'newExpression': {
        for (const child of namedChildren(node)) {
          if (child.kind === 'arguments') {
            this.inferArguments(child, scopeId);
          }
        }
        return OBJECT_TYPE;
      }
      case 'binaryExpression': {
        const operands = namedChildren(node).map((child) => this.inferExpression(child, scopeId));
        const allNumbers = operands.length > 0 && operands.every((type) => type.kind === 'Number');
        return allNumbers ? NUMBER_TYPE : UNKNOWN_TYPE;
      }
      case 'unaryExpression':
      case 'awaitExpression':
      case 'parenthesizedExpression':
      case 'spreadElement':
      case 'templateSubstitution': {
        const children = namedChildren(node);
        const value = children[children.length - 1];
        return value === undefined ? UNKNOWN_TYPE : this.inferExpression(value, scopeId);
      }
      case 'conditionalExpression': {
        const branches = namedChildren(node);
        const thenType = branches[1];
        const elseType = branches[2];
        if (thenType === undefined || elseType === undefined) {
          return UNKNOWN_TYPE;
        }
        const left = this.inferExpression(thenType, scopeId);
        const right = this.inferExpression(elseType, scopeId);
        return sameTypeKind(left, right) ? left : UNKNOWN_TYPE;
      }
      case 'assignmentExpression': {
        const children = namedChildren(node);
        const target = children[0];
        const value = children[children.length - 1];
        if (target?.kind === 'identifier') {
          const symbol = this.resolveName(target.text, scopeId);
          this.createReference(target.text, 'assignment', target, scopeId, symbol);
        }
        return value === undefined ? UNKNOWN_TYPE : this.inferExpression(value, scopeId);
      }
      case 'subscriptExpression': {
        const children = namedChildren(node);
        const object = children[0];
        if (object !== undefined) {
          this.inferExpression(object, scopeId);
        }
        return UNKNOWN_TYPE;
      }
      case 'arrowFunction':
        return this.inferArrowFunction(node, scopeId);
      case 'error':
      case 'unknown': {
        for (const child of namedChildren(node)) {
          this.inferExpression(child, scopeId);
        }
        return UNKNOWN_TYPE;
      }
      default: {
        if (node.kind === 'variableDeclaration' || node.kind === 'functionDeclaration') {
          this.analyzeBodyNode(node, scopeId);
          return UNKNOWN_TYPE;
        }
        for (const child of namedChildren(node)) {
          if (child.kind !== 'arguments') {
            this.inferExpression(child, scopeId);
          }
        }
        return UNKNOWN_TYPE;
      }
    }
  }

  private inferCall(node: SyntaxNode, scopeId: string): StrudelType {
    const children = namedChildren(node);
    const callee = children.find((child) => child.kind !== 'arguments');
    const args = children.find((child) => child.kind === 'arguments');
    if (callee === undefined) {
      if (args !== undefined) {
        this.inferArguments(args, scopeId);
      }
      return UNKNOWN_TYPE;
    }

    const info = this.inferCallee(callee, scopeId);
    if (args !== undefined) {
      this.inferArguments(args, scopeId, info.entry, info.ownerName);
    }

    return info.type.kind === 'Function' || info.type.kind === 'PatternMethod'
      ? (info.type.returnType ?? UNKNOWN_TYPE)
      : UNKNOWN_TYPE;
  }

  private inferCallee(node: SyntaxNode, scopeId: string): CalleeInfo {
    if (node.kind === 'identifier') {
      const symbol = this.resolveName(node.text, scopeId);
      this.createReference(node.text, 'call', node, scopeId, symbol);
      return {
        type: symbol?.type ?? UNKNOWN_TYPE,
        entry: symbol === undefined ? undefined : this.catalogEntriesById.get(symbol.id),
        ownerName: node.text,
      };
    }

    if (node.kind === 'memberExpression') {
      const info = this.inferMemberExpression(node, scopeId);
      return {
        type: info.type,
        entry: info.entry,
        ownerName: info.propertyName ?? 'method',
      };
    }

    return { type: this.inferExpression(node, scopeId), ownerName: 'call' };
  }

  private inferMemberExpression(node: SyntaxNode, scopeId: string): MemberInfo {
    const property = this.propertyNode(node);
    if (property === undefined) {
      return { type: UNKNOWN_TYPE };
    }

    const receiverType = this.receiverType(node, scopeId);
    const entry =
      receiverType.kind === 'Pattern'
        ? this.catalog.getMethod(property.text, receiverType)
        : undefined;
    const symbol =
      entry === undefined ? undefined : this.ensureBuiltin(property.text, 'method', entry);

    this.createReference(property.text, 'method', property, scopeId, symbol);
    return {
      type: symbol?.type ?? UNKNOWN_TYPE,
      entry,
      propertyName: property.text,
    };
  }

  private propertyNode(node: SyntaxNode): SyntaxNode | undefined {
    const named = namedChildren(node);
    return named.find((child, index) => child.kind === 'identifier' && index > 0);
  }

  private receiverType(node: SyntaxNode, scopeId: string): StrudelType {
    const property = this.propertyNode(node);
    const object = namedChildren(node).find((child) => child !== property);
    return object === undefined ? UNKNOWN_TYPE : this.inferExpression(object, scopeId);
  }

  private inferArguments(
    node: SyntaxNode,
    scopeId: string,
    entry?: SemanticCatalogEntry,
    ownerName = 'call',
  ): void {
    const miniNotationPositions = new Set(entry?.miniNotationArguments ?? []);
    let argumentIndex = 0;

    for (const argument of namedChildren(node)) {
      const acceptsMiniNotation = miniNotationPositions.has(argumentIndex);
      const isMiniNotation = acceptsMiniNotation && isMiniNotationString(argument);
      this.inferExpression(argument, scopeId);
      if (acceptsMiniNotation) {
        this.tryInferSampleName(argument, scopeId);
      }
      if (isMiniNotation) {
        this.analysis.miniNotationArguments.push({
          range: toSemanticRange(this.text, argument.range),
          ownerName,
          inferredType: MINI_NOTATION_PATTERN_TYPE,
          analysis: this.miniNotationAnalysis(argument),
        });
      }
      argumentIndex += 1;
    }
  }

  private tryInferSampleName(node: SyntaxNode, scopeId: string): StrudelType | undefined {
    if (node.kind !== 'string' || !node.text.startsWith('"') || node.text.length < 3) {
      return undefined;
    }
    const name = node.text.slice(1, -1);
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      return undefined;
    }
    const entry = this.catalog.getSample(name);
    if (entry?.kind !== 'sample') {
      return undefined;
    }
    const symbol = this.ensureBuiltin(name, 'sample', entry);
    this.createReference(name, 'value', node, scopeId, symbol, {
      start: { line: node.range.start.line, character: node.range.start.character + 1 },
      end: { line: node.range.end.line, character: node.range.end.character - 1 },
      startOffset: node.range.startOffset + 1,
      endOffset: node.range.endOffset - 1,
    });
    return entry.type;
  }

  private miniNotationAnalysis(node: SyntaxNode): MiniNotationAnalysis | undefined {
    // Template substitutions require mapping through nested expressions, which
    // is outside this lightweight token model. Plain double-quoted literals
    // are the form the pinned transpiler converts to mini notation.
    if (node.kind !== 'string' || !node.text.startsWith('"') || node.text.length < 2) {
      return undefined;
    }
    const startOffset = node.range.startOffset + 1;
    const endOffset = node.range.endOffset - 1;
    if (endOffset <= startOffset) {
      return undefined;
    }
    return analyzeMiniNotation(this.text, startOffset, endOffset);
  }

  private inferArrowFunction(node: SyntaxNode, scopeId: string): StrudelType {
    const scope = this.createScope(
      'function',
      toSemanticRange(this.text, node.range),
      scopeId,
      'arrow',
    );

    const parameters = namedChildren(node).find((child) => child.kind === 'formalParameters');
    const body = namedChildren(node).find((child) => child.kind !== 'formalParameters');
    const descriptors = parameters === undefined ? [] : parameterDescriptors(parameters);
    const inferredTypes = this.inferParameterTypesFromUsage(
      body,
      descriptors.map((descriptor) => descriptor.name),
    );
    const parameterSymbols = descriptors.map((descriptor) =>
      this.declare(
        descriptor.name,
        'parameter',
        inferredTypes.get(descriptor.name) ?? UNKNOWN_TYPE,
        toSemanticRange(this.text, descriptor.nameNode.range),
        scope.id,
      ),
    );

    if (body === undefined) {
      return functionType(
        UNKNOWN_TYPE,
        signatureForParameters(
          '',
          descriptors,
          parameterSymbols.map((parameterSymbol) => parameterSymbol.type),
          'user',
        ),
      );
    }
    const returnType =
      body.kind === 'block'
        ? (this.analyzeBodyNode(body, scope.id) ?? UNKNOWN_TYPE)
        : this.inferExpression(body, scope.id);
    return functionType(
      returnType,
      signatureForParameters(
        '',
        descriptors,
        parameterSymbols.map((parameterSymbol) => parameterSymbol.type),
        'user',
      ),
    );
  }
}
