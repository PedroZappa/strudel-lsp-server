'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

const ROOT = process.env.STRUDEL_SMOKE_ROOT || path.resolve(__dirname, '..', '..', '..');
const SERVER_MODULE =
  process.env.STRUDEL_SERVER_MODULE || path.join(ROOT, 'dist', 'src', 'server.js');
const RESULT_PATH = process.env.STRUDEL_SMOKE_RESULT_PATH;
const DOCUMENT_TEXT = [
  'const localPattern = s("bd sd").fast(2)',
  'localPattern',
  'missingGlobal()',
].join('\n');

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(label, predicate, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${label}`);
}

function diagnosticCode(diagnostic) {
  const code = diagnostic.code;
  if (typeof code === 'string') {
    return code;
  }
  if (code && typeof code === 'object' && typeof code.value === 'string') {
    return code.value;
  }
  return undefined;
}

function symbolNames(symbols) {
  return symbols.flatMap((symbol) => [symbol.name, ...symbolNames(symbol.children || [])]);
}

function writeResult(result) {
  if (!RESULT_PATH) {
    return;
  }
  fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function run() {
  const behaviours = [];
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'strudel-lsp-vscode-smoke-'));
  const documentPath = path.join(temporaryDirectory, 'smoke.strudel');
  let client;

  try {
    fs.writeFileSync(documentPath, DOCUMENT_TEXT, 'utf8');

    const serverOptions = {
      run: {
        command: process.execPath,
        args: [SERVER_MODULE],
        transport: TransportKind.stdio,
      },
      debug: {
        command: process.execPath,
        args: [SERVER_MODULE],
        transport: TransportKind.stdio,
      },
    };
    const clientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'strudel' },
        { scheme: 'untitled', language: 'strudel' },
      ],
      diagnosticCollectionName: 'strudel-lsp-smoke',
      synchronize: { configurationSection: 'strudelLsp' },
    };

    client = new LanguageClient(
      'strudelLspSmoke',
      'Strudel LSP smoke client',
      serverOptions,
      clientOptions,
    );
    await client.start();

    const capabilities = client.initializeResult?.capabilities;
    assert.ok(capabilities, 'initialize result must be available');
    assert.ok(capabilities.completionProvider, 'completion capability is missing');
    assert.ok(capabilities.documentSymbolProvider, 'document symbol capability is missing');
    assert.equal(capabilities.textDocumentSync, 2, 'incremental sync was not advertised');
    behaviours.push('initialize/capabilities over stdio through vscode-languageclient');

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(documentPath));
    assert.equal(document.languageId, 'strudel', 'Strudel language contribution was not applied');
    const editor = await vscode.window.showTextDocument(document, { preview: true });

    await waitFor('unknown-global diagnostic', async () =>
      vscode.languages
        .getDiagnostics(document.uri)
        .some((diagnostic) => diagnosticCode(diagnostic) === 'unknown-global'),
    );
    behaviours.push('didOpen publishes diagnostics for an unresolved global');

    const completion = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      document.uri,
      new vscode.Position(1, 'localPattern'.length),
    );
    const completionLabels = completion.items.map((item) =>
      typeof item.label === 'string' ? item.label : item.label.label,
    );
    assert.ok(
      completionLabels.includes('localPattern'),
      `local completion missing from ${completionLabels.join(', ')}`,
    );
    behaviours.push('position-aware completion returns the local declaration');

    const symbols = await vscode.commands.executeCommand(
      'vscode.executeDocumentSymbolProvider',
      document.uri,
    );
    assert.ok(symbolNames(symbols).includes('localPattern'));
    behaviours.push('document symbols expose the declared pattern');

    await editor.edit((builder) => {
      builder.insert(new vscode.Position(2, 0), 'const changed = 3;\n');
    });
    await waitFor('updated document symbols', async () => {
      const updated = await vscode.commands.executeCommand(
        'vscode.executeDocumentSymbolProvider',
        document.uri,
      );
      return symbolNames(updated).includes('changed');
    });
    behaviours.push('didChange is synchronized and updates document symbols');

    await client.stop();
    client = undefined;
    behaviours.push('shutdown and language-client stop complete');

    const clientPackage = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'client', 'node_modules', 'vscode-languageclient', 'package.json'),
        'utf8',
      ),
    );
    writeResult({
      schemaVersion: 1,
      client: 'vscode',
      editorVersion: vscode.version,
      clientLibraryVersion: clientPackage.version,
      serverModule: 'dist/src/server.js',
      transport: 'stdio',
      status: 'pass',
      behaviours,
    });
  } catch (error) {
    writeResult({
      schemaVersion: 1,
      client: 'vscode',
      status: 'fail',
      behaviours,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (client) {
      await client.stop();
    }
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

module.exports = { run };
