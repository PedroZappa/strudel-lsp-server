#!/usr/bin/env node

import {
  CodeActionKind,
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  MarkupKind,
  ProposedFeatures,
  SemanticTokensBuilder,
  SymbolKind,
  TextDocumentSyncKind,
  type CodeAction,
  type CodeActionParams,
  type CompletionItem,
  type CompletionParams,
  type DefinitionParams,
  type Diagnostic,
  type DocumentFormattingParams,
  type DocumentSymbol as LspDocumentSymbol,
  type DocumentSymbolParams,
  type Hover,
  type HoverParams,
  type InitializeResult,
  type Location,
  type PrepareRenameParams,
  type Range as LspRange,
  type ReferenceParams,
  type RenameParams,
  type SemanticTokens,
  type SemanticTokensLegend,
  type SemanticTokensParams,
  type SignatureHelp,
  type SignatureHelpParams,
  type TextEdit,
  type WorkspaceEdit,
} from 'vscode-languageserver/node';

import {
  provideCompletion,
  provideDefinition,
  provideDiagnostics,
  provideDocumentSymbols,
  provideFormatting,
  prepareRename,
  provideHover,
  provideQuickFixes,
  provideReferences,
  provideRename,
  provideSemanticTokens,
  provideSignatureHelp,
  type CompletionCandidateKind,
  type DiagnosticSeverityName,
  type DocumentSymbolKind,
  type DocumentSymbolResult,
  type FeatureContext,
  type LanguageDiagnostic,
  type SemanticTokenModifier,
  type SemanticTokenType,
  type TextEditResult,
} from './features/index.js';
import {
  createDefaultLanguageDatabase,
  createCatalogFromLanguageDatabase,
} from './languageDatabase/index.js';
import { DocumentAnalysisService, type AnalyzedDocument } from './lsp/index.js';
import { createSemanticEngine, type SemanticRange } from './semantic/index.js';
import { createSyntaxAdapter } from './syntax/index.js';

const connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
const database = createDefaultLanguageDatabase();
const catalog = createCatalogFromLanguageDatabase(database);
const adapter = createSyntaxAdapter();
const engine = createSemanticEngine(catalog);
const documents = new DocumentAnalysisService(adapter, engine);
const pendingAnalyses = new Map<string, Promise<void>>();
const latestVersions = new Map<string, number>();

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

function publishDiagnostics(analyzed: AnalyzedDocument): void {
  guard(undefined, () => {
    const context = contextFor(analyzed, 0);
    const diagnostics: Diagnostic[] = provideDiagnostics(context).map(toLspDiagnostic);
    void connection.sendDiagnostics({ uri: analyzed.document.uri, diagnostics });
  });
}

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ['.'] },
    codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix], resolveProvider: false },
    hoverProvider: true,
    signatureHelpProvider: { triggerCharacters: ['(', ','] },
    definitionProvider: true,
    referencesProvider: true,
    documentSymbolProvider: true,
    documentFormattingProvider: true,
    semanticTokensProvider: {
      legend: SEMANTIC_TOKENS_LEGEND,
      range: false,
      full: true,
    },
    renameProvider: { prepareProvider: true },
  },
}));

connection.onInitialized(() => undefined);

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

connection.onCompletion((params: CompletionParams): Promise<CompletionItem[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const offset = analyzed.document.offsetAt(params.position);
    return provideCompletion(contextFor(analyzed, offset), offset).map(
      (candidate): CompletionItem => ({
        label: candidate.label,
        kind: toCompletionItemKind(candidate.kind),
        detail: candidate.detail,
        documentation:
          candidate.documentation === undefined
            ? undefined
            : { kind: MarkupKind.Markdown, value: candidate.documentation },
        textEdit: {
          range: toLspRange(candidate.replacementRange),
          newText: candidate.label,
        },
      }),
    );
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
    return provideQuickFixes(context, range).map((action): CodeAction => ({
      title: action.title,
      kind: CodeActionKind.QuickFix,
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

connection.onDefinition((params: DefinitionParams): Promise<Location[] | null> =>
  guardAsync(null, async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return null;
    }
    const offset = analyzed.document.offsetAt(params.position);
    const result = provideDefinition(contextFor(analyzed, offset), offset);
    return result === undefined
      ? null
      : [{ uri: analyzed.document.uri, range: toLspRange(result.range) }];
  }),
);

connection.onReferences((params: ReferenceParams): Promise<Location[]> =>
  guardAsync([], async () => {
    await awaitDocumentAnalysis(params.textDocument.uri);
    const analyzed = documents.get(params.textDocument.uri);
    if (analyzed === undefined) {
      return [];
    }
    const offset = analyzed.document.offsetAt(params.position);
    return provideReferences(
      contextFor(analyzed, offset),
      offset,
      params.context.includeDeclaration,
    ).map((reference) => ({
      uri: analyzed.document.uri,
      range: toLspRange(reference.range),
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
      signatures: [
        {
          label: result.label,
          documentation:
            result.documentation === undefined
              ? undefined
              : { kind: MarkupKind.Markdown, value: result.documentation },
          parameters: result.parameters.map((parameter) => ({
            label: [...parameter.labelRange],
            documentation: parameter.documentation,
          })),
        },
      ],
      activeSignature: 0,
      activeParameter: result.activeParameter,
    };
  }),
);

connection.onShutdown(() => undefined);
connection.onExit(() => undefined);

connection.listen();
