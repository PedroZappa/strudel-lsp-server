"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
DiagnosticSeverity,
;
from;
'vscode-languageserver/node';
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const conn = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Create a simple text document manager.
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// Server capabilities
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
// ************************************************************************** //
//                                    Init                                    //
// ************************************************************************** //
conn.onInitialize((params) => {
    const capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation);
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
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
        conn.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        conn.workspace.onDidChangeWorkspaceFolders(_event => {
            conn.console.log('Workspace folder change event received.');
        });
    }
});
// Used when the `workspace/configuration` request is not supported by the client.
const defaultSettings = {
    maxErrorCount: 100
};
let globalSettings = defaultSettings;
// Cache the settings of all open documents
const documentSettings = new Map();
conn.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    }
    else {
        globalSettings = ((change.settings.strudelLanguageServer || defaultSettings));
    }
    // Refresh the diagnostics since the `strudel` setting could have changed.
    // We could optimize things here and re-fetch the setting first can compare it
    // to the existing setting, but this is out of scope for this example.
    conn.languages.diagnostics.refresh();
});
// Keep only settings for open docs
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});
/**
  * @method getDocumentSettings
  * @description Get the settings for a given document
  */
function getDocumentSettings(resource) {
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
            kind: node_1.DocumentDiagnosticReportKind.Full,
            items: await validateTextDocument(doc)
        };
    }
    else {
        // We don't know the document. We can either try to read it from disk
        // or we don't report problems for it.
        return {
            kind: node_1.DocumentDiagnosticReportKind.Full,
            items: []
        };
    }
});
/**
  * @method validateTextDocument
  * @description Validate a text document
  * @param {TextDocument} textDocument
  * @returns {Promise<Diagnostic[]>}
  */
async function validateTextDocument(textDocument) {
    // Get settings on every validation run
    const settings = await getDocumentSettings(textDocument.uri);
    // The validator creates diagnostics for all uppercase words length 2 and more
    const text = textDocument.getText();
    const pattern = /\b[A-Z]{2,}\b/g;
    let m;
    let errors = 0;
    const diagnostics = [];
    while ((m = pattern.exec(text)) && (errors < settings.maxErrorCount)) {
        errors++;
        const errorDiagnostic = {
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
conn.onCompletion((_textDocPosition) => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
        {
            label: 'TypeScript',
            kind: node_1.CompletionItemKind.Text,
            data: 1
        },
        {
            label: 'JavaScript',
            kind: node_1.CompletionItemKind.Text,
            data: 2
        }
    ];
});
// This handler resolves additional information for the item selected in
// the completion list.
conn.onCompletionResolve((item) => {
    if (item.data === 1) {
        item.detail = 'TypeScript details';
        item.documentation = 'TypeScript documentation';
    }
    else if (item.data === 2) {
        item.detail = 'JavaScript details';
        item.documentation = 'JavaScript documentation';
    }
    return item;
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(conn);
// Listen on the connection
conn.listen();
//# sourceMappingURL=server.js.map