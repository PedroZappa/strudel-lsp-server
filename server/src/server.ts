/**
 * Strudel LSP Server
 * @author Zedro
 * @module
 *
 * @requires vscode-languageserver/node
 * @requires vscode-languageserver-textdocument
 *
 * @exports activate
 * @exports deactivate
 */

import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  DidChangeConfigurationNotification,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  Diagnostic,
  TextDocumentPositionParams,
  CompletionItem,
  CompletionItemKind,
} from 'vscode-languageserver/node'

import {
  TextDocument
} from 'vscode-languageserver-textdocument'
import { DiagnosticSeverity } from 'vscode';


// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const conn = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

// Server capabilities
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// ************************************************************************** //
//                                    Init                                    //
// ************************************************************************** //

conn.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      },
      // Diagnostics support
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false
      }
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

conn.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    conn.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    conn.workspace.onDidChangeWorkspaceFolders(_event => {
      conn.console.log('Workspace folder change event received.');
    });
  }

});

// ************************************************************************** //
//                                  Settings                                  //
// ************************************************************************** //

// Strudel LSP Settings
interface StrudelSettings {
  maxErrorCount: number
}

// Used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: StrudelSettings = {
  maxErrorCount: 100
};
let globalSettings: StrudelSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<StrudelSettings>>();

conn.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = (
      (change.settings.strudelLanguageServer || defaultSettings)
    );
  }

  // Refresh the diagnostics since the `strudel` setting could have changed.
  // We could optimize things here and re-fetch the setting first can compare it
  // to the existing setting, but this is out of scope for this example.
  conn.languages.diagnostics.refresh();
});

// Keep only settings for open docs
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
})

/** 
  * @method getDocumentSettings
  * @description Get the settings for a given document
  */
function getDocumentSettings(resource: string): Thenable<StrudelSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = conn.workspace.getConfiguration({
      scopeUri: resource,
      section: 'strudelLanguageServer'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

conn.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  conn.console.log('We received a file change event');
});

// ************************************************************************** //
//                                Diagnostics                                 //
// ************************************************************************** //

conn.languages.diagnostics.on(async (params) => {
  const doc = documents.get(params.textDocument.uri);
  if (doc !== undefined) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: await validateTextDocument(doc)
    } satisfies DocumentDiagnosticReport
  } else {
    // We don't know the document. We can either try to read it from disk
    // or we don't report problems for it.
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: []
    } satisfies DocumentDiagnosticReport;
  }
});

/** 
  * @method validateTextDocument
  * @description Validate a text document
  * @param {TextDocument} textDocument
  * @returns {Promise<Diagnostic[]>}
  */
async function validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
  // Get settings on every validation run
  const settings: StrudelSettings = await getDocumentSettings(textDocument.uri);

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text: string = textDocument.getText();
  const pattern: RegExp = /\b[A-Z]{2,}\b/g;
  let m: RegExpExecArray | null;

  let errors = 0;
  const diagnostics: Diagnostic[] = [];
  while ((m = pattern.exec(text)) && (errors < settings.maxErrorCount)) {
    errors++;
    const errorDiagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length)
      },
      message: `${m[0]} is all uppercase.`,
      source: 'strudel'
    };
    if (hasDiagnosticRelatedInformationCapability) {
      errorDiagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, errorDiagnostic.range)
          },
          message: 'Spelling matters'
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, errorDiagnostic.range)
          },
          message: 'Especially for names'

        }
      ];
    }
    diagnostics.push(errorDiagnostic);
  }
  return diagnostics;
}

// ************************************************************************** //
//                                 Completion                                 //
// ************************************************************************** //

// This handler provides the initial list of the completion items.
conn.onCompletion(
  (_textDocPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [

      {
        label: 'TypeScript',
        kind: CompletionItemKind.Text,
        data: 1
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2
      }
    ]
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
conn.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(conn);

// Listen on the connection
conn.listen();
