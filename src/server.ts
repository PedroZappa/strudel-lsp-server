#!/usr/bin/env node

import {
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  MarkupKind,
  ProposedFeatures,
  TextDocumentSyncKind,
  type CompletionItem,
  type CompletionParams,
  type DefinitionParams,
  type Diagnostic,
  type Hover,
  type HoverParams,
  type InitializeResult,
  type Location,
  type Range as LspRange,
  type ReferenceParams,
  type SignatureHelp,
  type SignatureHelpParams,
} from 'vscode-languageserver/node';

import {
  provideCompletion,
  provideDefinition,
  provideDiagnostics,
  provideHover,
  provideReferences,
  provideSignatureHelp,
  type CompletionCandidateKind,
  type DiagnosticSeverityName,
  type FeatureContext,
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
    const diagnostics: Diagnostic[] = provideDiagnostics(context).map((diagnostic) => ({
      range: toLspRange(diagnostic.range),
      severity: toLspSeverity(diagnostic.severity),
      message: diagnostic.message,
      source: diagnostic.source,
      code: diagnostic.code,
    }));
    void connection.sendDiagnostics({ uri: analyzed.document.uri, diagnostics });
  });
}

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ['.'] },
    hoverProvider: true,
    signatureHelpProvider: { triggerCharacters: ['(', ','] },
    definitionProvider: true,
    referencesProvider: true,
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
