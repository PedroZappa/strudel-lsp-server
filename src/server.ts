#!/usr/bin/env node

import {
  CodeActionKind,
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  InlayHintKind,
  MarkupKind,
  ProposedFeatures,
  SemanticTokensBuilder,
  SymbolKind,
  TextDocumentSyncKind,
  type CallHierarchyIncomingCall,
  type CallHierarchyIncomingCallsParams,
  type CallHierarchyItem,
  type CallHierarchyOutgoingCall,
  type CallHierarchyOutgoingCallsParams,
  type CallHierarchyPrepareParams,
  type CodeAction,
  type CancellationToken,
  type CodeActionParams,
  type Features as ServerFeatures,
  type Languages as ServerLanguages,
  type _ as ServerFeaturePlaceholder,
  type CompletionItem,
  type CompletionParams,
  type DefinitionParams,
  type Diagnostic,
  type DidChangeConfigurationParams,
  type DocumentFormattingParams,
  type FoldingRange,
  type DocumentRangeFormattingParams,
  type DocumentSymbol as LspDocumentSymbol,
  type DocumentSymbolParams,
  type Hover,
  type HoverParams,
  type InlayHint,
  type InitializeParams,
  type InitializeResult,
  type Location,
  type PrepareRenameParams,
  type Range as LspRange,
  type ReferenceParams,
  type RenameParams,
  type SelectionRange,
  type SemanticTokens,
  type SemanticTokensLegend,
  type SemanticTokensParams,
  type SignatureHelp,
  type SignatureHelpParams,
  type TextEdit,
  type WorkspaceEdit,
  type WorkspaceFolder,
  type WorkspaceSymbol,
  type WorkspaceSymbolParams,
} from 'vscode-languageserver/node';

import {
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  DEFAULT_INLAY_HINTS_CONFIGURATION,
  parseDiagnosticsConfiguration,
  parseInlayHintsConfiguration,
} from './configuration/index.js';
import {
  prepareCallHierarchy,
  provideCallHierarchyCalls,
  provideCompletion,
  provideDefinition,
  provideDiagnostics,
  provideDocumentSymbols,
  findImportPathCompletion,
  provideFoldingRanges,
  provideFormatting,
  provideInlayHints,
  prepareRename,
  provideHover,
  provideQuickFixes,
  provideRangeFormatting,
  provideReferences,
  provideRefactorings,
  provideRename,
  provideSemanticTokens,
  provideSelectionRanges,
  provideSignatureHelp,
  resolveCompletion,
  resolveWorkspaceSymbol,
  provideWorkspaceSymbols,
  type CallHierarchyData,
  type CallHierarchyItemResult,
  type CodeActionKindName,
  type CompletionCandidateKind,
  type DiagnosticSeverityName,
  type DocumentSymbolKind,
  type DocumentSymbolResult,
  type FeatureContext,
  type LanguageDiagnostic,
  type SemanticTokenModifier,
  type SemanticTokenType,
  type TextEditResult,
  type WorkspaceSymbolResult,
} from './features/index.js';
import {
  createDefaultLanguageDatabase,
  createCatalogFromLanguageDatabase,
} from './languageDatabase/index.js';
import {
  DocumentAnalysisService,
  provideWorkspaceDefinition,
  provideWorkspaceReferences,
  readWorkspaceFiles,
  type AnalyzedDocument,
} from './lsp/index.js';
import { createSemanticEngine, type SemanticRange } from './semantic/index.js';
import { createSyntaxAdapter } from './syntax/index.js';

type StrudelServerFeatures = ServerFeatures<
  ServerFeaturePlaceholder,
  ServerFeaturePlaceholder,
  ServerFeaturePlaceholder,
  ServerFeaturePlaceholder,
  ServerFeaturePlaceholder,
  ServerFeaturePlaceholder,
  ServerLanguages,
  ServerFeaturePlaceholder
>;

// `ProposedFeatures.all` is deliberately typed with erased feature shapes even
// though the connection installs the full default language feature set.
const strudelFeatures = ProposedFeatures.all as StrudelServerFeatures;
const connection = createConnection(strudelFeatures, process.stdin, process.stdout);
const database = createDefaultLanguageDatabase();
const catalog = createCatalogFromLanguageDatabase(database);
const adapter = createSyntaxAdapter();
const engine = createSemanticEngine(catalog);
const documents = new DocumentAnalysisService(adapter, engine);
const pendingAnalyses = new Map<string, Promise<void>>();
const latestVersions = new Map<string, number>();
let workspaceRootUris: readonly string[] = [];
let workspaceFoldersSupported = false;
let configurationSupported = false;
let inlayHintRefreshSupported = false;
let workspaceSymbolRangeResolveSupported = false;
let diagnosticsConfiguration = DEFAULT_DIAGNOSTICS_CONFIGURATION;
let inlayHintsConfiguration = DEFAULT_INLAY_HINTS_CONFIGURATION;

const SEMANTIC_TOKEN_TYPES: readonly SemanticTokenType[] = [
  'function',
  'method',
  'variable',
  'parameter',
  'number',
  'operator',
];
const SEMANTIC_TOKEN_MODIFIERS: readonly SemanticTokenModifier[] = [
  'declaration',
  'defaultLibrary',
];
const SEMANTIC_TOKENS_LEGEND: SemanticTokensLegend = {
  tokenTypes: [...SEMANTIC_TOKEN_TYPES],
  tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS],
};

function guard<T>(fallback: T, operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    connection.console.error(`Strudel LSP request failed: ${message}`);
    return fallback;
  }
}

async function guardAsync<T>(fallback: T, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    connection.console.error(`Strudel LSP request failed: ${message}`);
    return fallback;
  }
}

function scheduleDocumentUpdate(uri: string, version: number, update: () => void): void {
  const latestVersion = latestVersions.get(uri);
  if (latestVersion !== undefined && version < latestVersion) {
    return;
  }
  latestVersions.set(uri, version);
  const task = new Promise<void>((resolveTask) => {
    setImmediate(() => {
      try {
        if (latestVersions.get(uri) !== version) {
          return;
        }
        update();
        const analyzed = documents.get(uri);
        if (analyzed !== undefined) {
          publishDiagnostics(analyzed);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        connection.console.error(`Strudel document analysis failed: ${message}`);
      } finally {
        resolveTask();
      }
    });
  });

  pendingAnalyses.set(uri, task);
  void task.then(() => {
    if (pendingAnalyses.get(uri) === task) {
      pendingAnalyses.delete(uri);
    }
  });
}

async function awaitDocumentAnalysis(uri: string): Promise<void> {
  const task = pendingAnalyses.get(uri);
  if (task !== undefined) {
    await task;
  }
}

function cancelDocumentAnalysis(uri: string): void {
  latestVersions.delete(uri);
  pendingAnalyses.delete(uri);
}

async function refreshConfiguration(params?: DidChangeConfigurationParams): Promise<void> {
  const value: unknown = configurationSupported
    ? await connection.workspace.getConfiguration('strudelLsp')
    : params?.settings;
  const previousInlayHints = inlayHintsConfiguration;
  const [diagnostics, inlayHints] = await Promise.all([
    guardAsync(diagnosticsConfiguration, () =>
      Promise.resolve(parseDiagnosticsConfiguration(value)),
    ),
    guardAsync(inlayHintsConfiguration, () => Promise.resolve(parseInlayHintsConfiguration(value))),
  ]);
  diagnosticsConfiguration = diagnostics;
  inlayHintsConfiguration = inlayHints;
  await Promise.all([...pendingAnalyses.values()]);
  for (const analyzed of documents.all()) {
    publishDiagnostics(analyzed);
  }
  if (inlayHints.enabled !== previousInlayHints.enabled && inlayHintRefreshSupported) {
    void connection.languages.inlayHint.refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      connection.console.error(`Strudel inlay hint refresh failed: ${message}`);
    });
  }
}

function toLspRange(range: SemanticRange): LspRange {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

function toLspSeverity(severity: DiagnosticSeverityName): DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return DiagnosticSeverity.Error;
    case 'warning':
      return DiagnosticSeverity.Warning;
    case 'information':
      return DiagnosticSeverity.Information;
    case 'hint':
      return DiagnosticSeverity.Hint;
  }
}

function toLspCodeActionKind(kind: CodeActionKindName): CodeActionKind {
  switch (kind) {
    case 'quickfix':
      return CodeActionKind.QuickFix;
    case 'refactor.inline':
      return CodeActionKind.RefactorInline;
    case 'refactor.extract':
      return CodeActionKind.RefactorExtract;
  }
}

function toLspDiagnostic(diagnostic: LanguageDiagnostic): Diagnostic {
  return {
    range: toLspRange(diagnostic.range),
    severity: toLspSeverity(diagnostic.severity),
    message: diagnostic.message,
    source: diagnostic.source,
    code: diagnostic.code,
  };
}

function semanticRangeFromLsp(
  document: AnalyzedDocument['document'],
  range: LspRange,
): SemanticRange {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
    startOffset: document.offsetAt(range.start),
    endOffset: document.offsetAt(range.end),
  };
}

function toWorkspaceEdit(uri: string, edits: readonly TextEditResult[]): WorkspaceEdit {
  return {
    changes: {
      [uri]: edits.map((edit): TextEdit => ({
        range: toLspRange(edit.range),
        newText: edit.newText,
      })),
    },
  };
}

function toLspSymbolKind(kind: DocumentSymbolKind): SymbolKind {
  switch (kind) {
    case 'function':
      return SymbolKind.Function;
    case 'variable':
    case 'parameter':
    case 'import':
      return SymbolKind.Variable;
  }
}

function toLspDocumentSymbol(symbol: DocumentSymbolResult): LspDocumentSymbol {
  return {
    name: symbol.name,
    kind: toLspSymbolKind(symbol.kind),
    detail: symbol.detail,
    range: toLspRange(symbol.range),
    selectionRange: toLspRange(symbol.selectionRange),
    children: symbol.children.map(toLspDocumentSymbol),
  };
}

function toLspWorkspaceSymbol(symbol: WorkspaceSymbolResult): WorkspaceSymbol {
  return {
    name: symbol.name,
    kind: toLspSymbolKind(symbol.kind),
    location: workspaceSymbolRangeResolveSupported
      ? { uri: symbol.uri }
      : { uri: symbol.uri, range: toLspRange(symbol.range) },
    containerName: symbol.containerName,
    data: symbol.data,
  };
}

function rememberWorkspaceRoots(params: InitializeParams | undefined): void {
  workspaceFoldersSupported = params?.capabilities?.workspace?.workspaceFolders === true;

  const folders: readonly WorkspaceFolder[] | undefined = Array.isArray(params?.workspaceFolders)
    ? params.workspaceFolders
    : undefined;
  const folderUris = (folders ?? []).flatMap((folder) =>
    typeof folder?.uri === 'string' ? [folder.uri] : [],
  );
  const rootUri = typeof params?.rootUri === 'string' ? [params.rootUri] : [];
  const candidates = folderUris.length > 0 ? folderUris : rootUri;
  workspaceRootUris = [...new Set(candidates)].filter((uri) => uri.startsWith('file:'));
}

async function workspaceRoots(): Promise<readonly string[]> {
  if (workspaceRootUris.length > 0) {
    return workspaceRootUris;
  }
  if (!workspaceFoldersSupported) {
    return [];
  }
  const folders = await connection.workspace.getWorkspaceFolders();
  return [
    ...new Set(
      (folders ?? []).flatMap((folder) => (typeof folder?.uri === 'string' ? [folder.uri] : [])),
    ),
  ].filter((uri) => uri.startsWith('file:'));
}

function toSemanticTokenModifiers(modifiers: readonly SemanticTokenModifier[]): number {
  let bits = 0;
  for (const modifier of modifiers) {
    const index = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
    if (index >= 0) {
      bits |= 1 << index;
    }
  }
  return bits;
}

function toCompletionItemKind(kind: CompletionCandidateKind): CompletionItemKind {
  switch (kind) {
    case 'function':
      return CompletionItemKind.Function;
    case 'file':
      return CompletionItemKind.File;
    case 'method':
      return CompletionItemKind.Method;
    case 'class':
      return CompletionItemKind.Class;
    case 'value':
      return CompletionItemKind.Value;
    case 'variable':
      return CompletionItemKind.Variable;
  }
}

function contextFor(analyzed: AnalyzedDocument, offset: number): FeatureContext {
  return {
    uri: analyzed.document.uri,
    text: analyzed.document.getText(),
    syntax: analyzed.syntax,
    semantic: analyzed.semantic,
    database,
    node: adapter.nodeAt(analyzed.syntax, offset),
  };
}

function workspaceContextsFor(token: CancellationToken): Promise<readonly FeatureContext[]> {
  return guardAsync([], async () => {
    await Promise.all([...pendingAnalyses.values()]);
    const openDocuments = documents.all();
    const openUris = new Set(openDocuments.map((entry) => entry.document.uri));
    const contexts: FeatureContext[] = openDocuments.map((entry) => contextFor(entry, 0));

    const roots = await workspaceRoots();
    if (roots.length === 0) {
      return contexts;
    }
    const files = await readWorkspaceFiles(roots, { token });
    for (const file of files) {
      if (token.isCancellationRequested) {
        return [];
      }
      if (openUris.has(file.uri)) {
        continue;
      }
      const syntax = adapter.parse({ uri: file.uri, version: 1, text: file.text });
      const semantic = engine.analyze(syntax, { token });
      contexts.push({ uri: file.uri, text: file.text, syntax, semantic, database });
    }
    return contexts;
  });
}

async function workspaceFileUrisFor(token: CancellationToken): Promise<readonly string[]> {
  return guardAsync([], async () => {
    if (token.isCancellationRequested) {
      return [];
    }
    const uris = new Set<string>();
    for (const entry of documents.all()) {
      const uri = entry.document.uri;
      if (uri.startsWith('file:') && uri.endsWith('.strudel')) {
        uris.add(uri);
      }
    }

    const roots = await workspaceRoots();
    if (roots.length === 0) {
      return [...uris];
    }
    const files = await readWorkspaceFiles(roots, { token });
    if (token.isCancellationRequested) {
      return [];
    }
    for (const file of files) {
      uris.add(file.uri);
    }
    return [...uris];
  });
}

function mayHaveWorkspaceImport(analyzed: AnalyzedDocument): boolean {
  return analyzed.document.getText().includes('import ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function callHierarchyData(item: CallHierarchyItem): CallHierarchyData | undefined {
  if (!isRecord(item.data)) {
    return undefined;
  }
  const data = item.data;
  if (
    typeof data.version !== 'number' ||
    typeof data.uri !== 'string' ||
    typeof data.symbolId !== 'string' ||
    typeof data.name !== 'string' ||
    data.name !== item.name ||
    data.uri !== item.uri
  ) {
    return undefined;
  }
  return {
    version: data.version,
    uri: data.uri,
    symbolId: data.symbolId,
    name: data.name,
  };
}

function toLspCallHierarchyItem(item: CallHierarchyItemResult): CallHierarchyItem {
  return {
    uri: item.uri,
    name: item.name,
    kind: SymbolKind.Function,
    range: toLspRange(item.range),
    selectionRange: toLspRange(item.selectionRange),
    data: item.data,
  };
}

function publishDiagnostics(analyzed: AnalyzedDocument): void {
  guard(undefined, () => {
    const context = contextFor(analyzed, 0);
    const diagnostics: Diagnostic[] = provideDiagnostics(context, diagnosticsConfiguration).map(
      toLspDiagnostic,
    );
    void connection.sendDiagnostics({ uri: analyzed.document.uri, diagnostics });
  });
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  rememberWorkspaceRoots(params);
  configurationSupported = params?.capabilities?.workspace?.configuration === true;
  inlayHintRefreshSupported = params?.capabilities?.workspace?.inlayHint?.refreshSupport === true;
  workspaceSymbolRangeResolveSupported =
    params?.capabilities?.workspace?.symbol?.resolveSupport?.properties?.includes(
      'location.range',
    ) === true;
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ['.'], resolveProvider: true },
      codeActionProvider: {
        codeActionKinds: [
          CodeActionKind.QuickFix,
          CodeActionKind.RefactorInline,
          CodeActionKind.RefactorExtract,
        ],
        resolveProvider: false,
      },
      hoverProvider: true,
      signatureHelpProvider: { triggerCharacters: ['(', ','] },
      definitionProvider: true,
      referencesProvider: true,
      callHierarchyProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: { resolveProvider: true },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      inlayHintProvider: true,
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        range: false,
        full: true,
      },
      renameProvider: { prepareProvider: true },
    },
  };
});

connection.onInitialized(() => {
  if (configurationSupported) {
    void refreshConfiguration();
  }
});

connection.onDidChangeConfiguration((params) => {
  void refreshConfiguration(params);
});

connection.onDidOpenTextDocument((params) => {
  scheduleDocumentUpdate(params.textDocument.uri, params.textDocument.version, () => {
    documents.open(params);
  });
});

connection.onDidChangeTextDocument((params) => {
  scheduleDocumentUpdate(params.textDocument.uri, params.textDocument.version, () => {
    documents.change(params);
  });
});

connection.onDidCloseTextDocument((params) => {
  cancelDocumentAnalysis(params.textDocument.uri);
  documents.close(params);
  void connection.sendDiagnostics({ uri: params.textDocument.uri, diagnostics: [] });
});

connection.onCompletion(
  (params: CompletionParams, token: CancellationToken): Promise<CompletionItem[]> =>
    guardAsync([], async () => {
      await awaitDocumentAnalysis(params.textDocument.uri);
      const analyzed = documents.get(params.textDocument.uri);
      if (analyzed === undefined) {
        return [];
      }
      const offset = analyzed.document.offsetAt(params.position);
      const context = contextFor(analyzed, offset);
      const workspaceFileUris =
        findImportPathCompletion(context, offset) === undefined
          ? []
          : await workspaceFileUrisFor(token);
      return provideCompletion(context, offset, { workspaceFileUris }).map(
        (candidate): CompletionItem => ({
          label: candidate.label,
          kind: toCompletionItemKind(candidate.kind),
          detail: candidate.detail,
          documentation:
            candidate.documentation === undefined
              ? undefined
              : { kind: MarkupKind.Markdown, value: candidate.documentation },
          data: candidate.data,
          textEdit: {
            range: toLspRange(candidate.replacementRange),
            newText: candidate.label,
          },
        }),
      );
    }),
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem =>
  guard(item, () => {
    const result = resolveCompletion({ label: item.label, data: item.data }, database);
    return {
      ...item,
      detail: result.detail ?? item.detail,
      documentation:
        result.documentation === undefined
          ? item.documentation
          : { kind: MarkupKind.Markdown, value: result.documentation },
    };
  }),
);

connection.onCodeAction((params: CodeActionParams): Promise<CodeAction[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const offset = analyzed.document.offsetAt(params.range.start);
    const context = contextFor(analyzed, offset);
    const range = semanticRangeFromLsp(analyzed.document, params.range);
    return [
      ...provideQuickFixes(context, range, diagnosticsConfiguration),
      ...provideRefactorings(context, range),
    ].map((action): CodeAction => ({
      title: action.title,
      kind: toLspCodeActionKind(action.kind),
      diagnostics: action.diagnostics.map(toLspDiagnostic),
      edit: {
        changes: {
          [analyzed.document.uri]: action.edits.map((edit): TextEdit => ({
            range: toLspRange(edit.range),
            newText: edit.newText,
          })),
        },
      },
    }));
  }),
);

connection.onHover((params: HoverParams): Promise<Hover | null> =>
  guardAsync(null, async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return null;
    }
    const offset = analyzed.document.offsetAt(params.position);
    const result = provideHover(contextFor(analyzed, offset), offset);
    if (result === undefined) {
      return null;
    }
    return {
      contents: { kind: MarkupKind.Markdown, value: result.contents },
      range: toLspRange(result.range),
    };
  }),
);

connection.onDefinition(
  (params: DefinitionParams, token: CancellationToken): Promise<Location[] | null> =>
    guardAsync(null, async () => {
      await awaitDocumentAnalysis(params.textDocument.uri);
      const analyzed = documents.get(params.textDocument.uri);
      if (analyzed === undefined) {
        return null;
      }
      const offset = analyzed.document.offsetAt(params.position);
      const context = contextFor(analyzed, offset);
      if (mayHaveWorkspaceImport(analyzed)) {
        const workspace = await workspaceContextsFor(token);
        const remote = provideWorkspaceDefinition(context, workspace, offset);
        if (remote !== undefined) {
          return [{ uri: remote.uri, range: toLspRange(remote.range) }];
        }
      }
      const result = provideDefinition(context, offset);
      return result === undefined
        ? null
        : [{ uri: analyzed.document.uri, range: toLspRange(result.range) }];
    }),
);

connection.onReferences((params: ReferenceParams, token: CancellationToken): Promise<Location[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const offset = analyzed.document.offsetAt(params.position);
    const context = contextFor(analyzed, offset);
    if (mayHaveWorkspaceImport(analyzed)) {
      const workspace = await workspaceContextsFor(token);
      return provideWorkspaceReferences(
        context,
        workspace,
        offset,
        params.context.includeDeclaration,
      ).map((reference) => ({
        uri: reference.uri,
        range: toLspRange(reference.range),
      }));
    }
    return provideReferences(context, offset, params.context.includeDeclaration).map(
      (reference) => ({
        uri: analyzed.document.uri,
        range: toLspRange(reference.range),
      }),
    );
  }),
);

connection.languages.callHierarchy.onPrepare(
  (params: CallHierarchyPrepareParams): Promise<CallHierarchyItem[] | null> =>
    guardAsync(null, async () => {
      await awaitDocumentAnalysis(params.textDocument.uri);
      const analyzed = documents.get(params.textDocument.uri);
      if (analyzed === undefined) {
        return null;
      }
      const offset = analyzed.document.offsetAt(params.position);
      return prepareCallHierarchy(contextFor(analyzed, offset), offset).map(toLspCallHierarchyItem);
    }),
);

async function callHierarchyContext(
  item: CallHierarchyItem,
): Promise<{ context: FeatureContext; data: CallHierarchyData } | undefined> {
  const data = callHierarchyData(item);
  if (data === undefined) {
    return undefined;
  }
  await awaitDocumentAnalysis(data.uri);
  const analyzed = documents.get(data.uri);
  return analyzed === undefined ? undefined : { context: contextFor(analyzed, 0), data };
}

connection.languages.callHierarchy.onIncomingCalls(
  (params: CallHierarchyIncomingCallsParams): Promise<CallHierarchyIncomingCall[]> =>
    guardAsync([], async () => {
      const resolved = await callHierarchyContext(params.item);
      if (resolved === undefined) {
        return [];
      }
      return provideCallHierarchyCalls(resolved.context, resolved.data, 'incoming').map((call) => ({
        from: toLspCallHierarchyItem(call.from),
        fromRanges: call.fromRanges.map(toLspRange),
      }));
    }),
);

connection.languages.callHierarchy.onOutgoingCalls(
  (params: CallHierarchyOutgoingCallsParams): Promise<CallHierarchyOutgoingCall[]> =>
    guardAsync([], async () => {
      const resolved = await callHierarchyContext(params.item);
      if (resolved === undefined) {
        return [];
      }
      return provideCallHierarchyCalls(resolved.context, resolved.data, 'outgoing').map((call) => ({
        to: toLspCallHierarchyItem(call.from),
        fromRanges: call.fromRanges.map(toLspRange),
      }));
    }),
);

connection.onDocumentSymbol((params: DocumentSymbolParams): Promise<LspDocumentSymbol[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    return provideDocumentSymbols(contextFor(analyzed, 0)).map(toLspDocumentSymbol);
  }),
);

connection.onWorkspaceSymbol(
  (params: WorkspaceSymbolParams, token: CancellationToken): Promise<WorkspaceSymbol[]> =>
    guardAsync([], async () => {
      try {
        const contexts = await workspaceContextsFor(token);
        return provideWorkspaceSymbols(contexts, params.query).map(toLspWorkspaceSymbol);
      } catch (error) {
        if (token.isCancellationRequested) {
          return [];
        }
        throw error;
      }
    }),
);

connection.onWorkspaceSymbolResolve((item: WorkspaceSymbol): WorkspaceSymbol =>
  guard(item, () => {
    const result = resolveWorkspaceSymbol({ name: item.name, data: item.data }, database);
    return {
      ...item,
      location:
        result.range === undefined
          ? item.location
          : { ...item.location, range: toLspRange(result.range) },
    };
  }),
);

connection.onDocumentFormatting((params: DocumentFormattingParams): Promise<TextEdit[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const result = provideFormatting(contextFor(analyzed, 0), {
      tabSize: params.options.tabSize,
      insertSpaces: params.options.insertSpaces,
    });
    return result.edits.map((edit): TextEdit => ({
      range: toLspRange(edit.range),
      newText: edit.newText,
    }));
  }),
);

connection.onDocumentRangeFormatting((params: DocumentRangeFormattingParams): Promise<TextEdit[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const result = provideRangeFormatting(
      contextFor(analyzed, 0),
      { tabSize: params.options.tabSize, insertSpaces: params.options.insertSpaces },
      semanticRangeFromLsp(analyzed.document, params.range),
    );
    return result.edits.map((edit): TextEdit => ({
      range: toLspRange(edit.range),
      newText: edit.newText,
    }));
  }),
);

connection.onFoldingRanges((params): Promise<FoldingRange[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    return provideFoldingRanges(contextFor(analyzed, 0)).map((range) => ({
      startLine: range.startLine,
      endLine: range.endLine,
      kind: range.kind,
    }));
  }),
);

connection.onSelectionRanges((params): Promise<SelectionRange[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const toLspSelectionRange = (
      range: ReturnType<typeof provideSelectionRanges>[number],
    ): SelectionRange => ({
      range: toLspRange(range.range),
      parent: range.parent === undefined ? undefined : toLspSelectionRange(range.parent),
    });
    return provideSelectionRanges(
      contextFor(analyzed, 0),
      params.positions.map((position) => ({
        line: position.line,
        character: position.character,
      })),
    ).map(toLspSelectionRange);
  }),
);

connection.languages.inlayHint.on((params): Promise<InlayHint[]> =>
  guardAsync([], async () => {
    if (!inlayHintsConfiguration.enabled) {
      return [];
    }
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    return provideInlayHints(contextFor(analyzed, 0)).map((hint) => ({
      position: hint.position,
      label: hint.label,
      kind: InlayHintKind.Type,
      paddingLeft: hint.paddingLeft,
      paddingRight: hint.paddingRight,
    }));
  }),
);

connection.languages.semanticTokens.on((params: SemanticTokensParams): Promise<SemanticTokens> =>
  guardAsync({ data: [] }, async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return { data: [] };
    }

    const builder = new SemanticTokensBuilder();
    for (const token of provideSemanticTokens(contextFor(analyzed, 0))) {
      const tokenType = SEMANTIC_TOKEN_TYPES.indexOf(token.type);
      if (tokenType < 0) {
        continue;
      }
      builder.push(
        token.range.start.line,
        token.range.start.character,
        token.range.end.character - token.range.start.character,
        tokenType,
        toSemanticTokenModifiers(token.modifiers),
      );
    }
    return builder.build();
  }),
);

connection.onPrepareRename(
  (params: PrepareRenameParams): Promise<{ range: LspRange; placeholder: string } | null> =>
    guardAsync(null, async () => {
      await awaitDocumentAnalysis(params.textDocument.uri);
      const analyzed = documents.get(params.textDocument.uri);
      if (analyzed === undefined) {
        return null;
      }
      const offset = analyzed.document.offsetAt(params.position);
      const result = prepareRename(contextFor(analyzed, offset), offset);
      return result === undefined
        ? null
        : { range: toLspRange(result.range), placeholder: result.placeholder };
    }),
);

connection.onRenameRequest((params: RenameParams): Promise<WorkspaceEdit | null> =>
  guardAsync(null, async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return null;
    }
    const offset = analyzed.document.offsetAt(params.position);
    const result = provideRename(contextFor(analyzed, offset), offset, params.newName);
    return result === undefined ? null : toWorkspaceEdit(analyzed.document.uri, result.edits);
  }),
);

connection.onSignatureHelp((params: SignatureHelpParams): Promise<SignatureHelp | null> =>
  guardAsync(null, async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return null;
    }
    const offset = analyzed.document.offsetAt(params.position);
    const result = provideSignatureHelp(contextFor(analyzed, offset), offset);
    if (result === undefined) {
      return null;
    }
    return {
      signatures: result.signatures.map((signature) => ({
        label: signature.label,
        documentation:
          signature.documentation === undefined
            ? undefined
            : { kind: MarkupKind.Markdown, value: signature.documentation },
        parameters: signature.parameters.map((parameter) => ({
          label: [...parameter.labelRange],
          documentation: parameter.documentation,
        })),
      })),
      activeSignature: result.activeSignature,
      activeParameter: result.activeParameter,
    };
  }),
);

connection.onShutdown(() => undefined);
connection.onExit(() => undefined);

connection.listen();
