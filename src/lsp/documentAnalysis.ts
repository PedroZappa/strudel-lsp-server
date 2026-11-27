import { performance } from 'node:perf_hooks';

import type {
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  TextDocumentContentChangeEvent,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { recordDuration, type LocalTimingRecorder } from '../performance/index.js';
import type { SemanticDocument, SemanticEngine } from '../semantic/index.js';
import type {
  SyntaxAdapter,
  SyntaxDocument,
  SyntaxEdit,
  TextDocumentSnapshot,
} from '../syntax/index.js';

export interface AnalyzedDocument {
  readonly document: TextDocument;
  readonly syntax: SyntaxDocument;
  readonly semantic: SemanticDocument;
}

function snapshotOf(document: TextDocument): TextDocumentSnapshot {
  return {
    uri: document.uri,
    version: document.version,
    text: document.getText(),
  };
}

function editsFor(
  document: TextDocument,
  changes: readonly TextDocumentContentChangeEvent[],
): readonly SyntaxEdit[] {
  if (changes.length !== 1) {
    return [];
  }

  const change = changes[0];
  if (change === undefined || !('range' in change) || change.range === undefined) {
    return [];
  }

  const startOffset = document.offsetAt(change.range.start);
  const oldEndOffset = document.offsetAt(change.range.end);
  return [
    {
      startOffset,
      oldEndOffset,
      newEndOffset: startOffset + change.text.length,
    },
  ];
}

export class DocumentAnalysisService {
  private readonly entries = new Map<string, AnalyzedDocument>();

  constructor(
    private readonly adapter: SyntaxAdapter,
    private readonly engine: SemanticEngine,
    private readonly timing?: LocalTimingRecorder,
  ) {}

  open(params: DidOpenTextDocumentParams): AnalyzedDocument {
    const { uri, languageId, version, text } = params.textDocument;
    const existing = this.entries.get(uri);
    if (existing !== undefined && version < existing.document.version) {
      return existing;
    }

    const document = TextDocument.create(uri, languageId, version, text);
    return this.analyze(document);
  }

  change(params: DidChangeTextDocumentParams): AnalyzedDocument {
    const { uri, version } = params.textDocument;
    const previous = this.entries.get(uri);
    if (previous !== undefined && version < previous.document.version) {
      return previous;
    }

    let document = previous?.document;
    document ??= TextDocument.create(uri, 'strudel', version, '');

    const edits = editsFor(document, params.contentChanges);
    TextDocument.update(document, [...params.contentChanges], version);

    return this.analyze(document, previous, edits);
  }

  close(params: DidCloseTextDocumentParams): void {
    this.entries.delete(params.textDocument.uri);
  }

  get(uri: string): AnalyzedDocument | undefined {
    return this.entries.get(uri);
  }

  all(): readonly AnalyzedDocument[] {
    return [...this.entries.values()];
  }

  private analyze(
    document: TextDocument,
    previous?: AnalyzedDocument,
    edits: readonly SyntaxEdit[] = [],
  ): AnalyzedDocument {
    const startedAt = this.timing === undefined ? undefined : performance.now();
    const snapshot = snapshotOf(document);
    const incremental = previous !== undefined && edits.length > 0;
    const syntaxStartedAt = this.timing === undefined ? undefined : performance.now();
    const syntax =
      incremental && previous !== undefined
        ? this.adapter.update(previous.syntax, snapshot, edits)
        : this.adapter.parse(snapshot);
    if (syntaxStartedAt !== undefined) {
      recordDuration(this.timing, 'document.syntax', syntaxStartedAt, {
        incremental,
        version: document.version,
      });
    }
    const semantic = this.engine.analyze(syntax, {
      previous: previous?.semantic,
      timing: this.timing,
    });
    if (startedAt !== undefined) {
      recordDuration(this.timing, 'document.analyze', startedAt, {
        incremental,
        version: document.version,
      });
    }
    const analyzed: AnalyzedDocument = { document, syntax, semantic };
    this.entries.set(document.uri, analyzed);
    return analyzed;
  }
}
