import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

import { RawStdioClient } from './helpers/rawStdioClient.js';

const CYCLE_COUNT = 3;
const EDITS_PER_CYCLE = 64;
const FLUSH_INTERVAL = 16;
const DOCUMENT_URI = 'file:///test/soak-lifecycle.strudel';
const FINAL_SYMBOL = 'soakFinal';

interface LspSymbol {
  name: string;
}

interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: readonly unknown[];
}

function editText(index: number): string {
  if (index === EDITS_PER_CYCLE - 1) {
    return `const ${FINAL_SYMBOL} = ${index};\n${FINAL_SYMBOL}\n`;
  }
  if (index % 9 === 3) {
    return `const partial${index} = s("bd").\n`;
  }
  if (index % 9 === 6) {
    return `if (${index}\n`;
  }
  return `const step${index} = ${index};\nstep${index}\n`;
}

function isSymbolArray(value: unknown): value is LspSymbol[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { name?: unknown }).name === 'string',
    )
  );
}

function isDiagnosticsParams(value: unknown): value is PublishDiagnosticsParams {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { uri?: unknown }).uri === 'string' &&
    Array.isArray((value as { diagnostics?: unknown }).diagnostics)
  );
}

function symbolNames(result: unknown): string[] {
  assert.ok(isSymbolArray(result));
  return result.map((symbol) => symbol.name);
}

function sampleRssKiB(pid: number | undefined): number | undefined {
  if (process.platform === 'win32' || pid === undefined) {
    return undefined;
  }
  try {
    const output = execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], {
      encoding: 'utf8',
    });
    const match = /\d+/.exec(output);
    const value = match === null ? Number.NaN : Number(match[0]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function assertCleanTransport(client: RawStdioClient): void {
  assert.deepEqual(client.stdoutViolations, []);
  assert.equal(client.pendingStdoutBytes, 0);
  assert.equal(client.stderrText, '');
}

async function runLifecycleCycle(): Promise<readonly number[]> {
  const client = new RawStdioClient();
  const rssSamples: number[] = [];

  try {
    await client.initialize();
    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: DOCUMENT_URI,
        languageId: 'strudel',
        version: 1,
        text: 'const initial = 0;\ninitial\n',
      },
    });

    const baseline = sampleRssKiB(client.pid);
    if (baseline !== undefined) {
      rssSamples.push(baseline);
    }

    for (let index = 0; index < EDITS_PER_CYCLE; index += 1) {
      client.notify('textDocument/didChange', {
        textDocument: { uri: DOCUMENT_URI, version: index + 2 },
        contentChanges: [{ text: editText(index) }],
      });
      if (index % FLUSH_INTERVAL === FLUSH_INTERVAL - 1) {
        await client.request('textDocument/documentSymbol', {
          textDocument: { uri: DOCUMENT_URI },
        });
        const sample = sampleRssKiB(client.pid);
        if (sample !== undefined) {
          rssSamples.push(sample);
        }
      }
    }

    client.notify('textDocument/didChange', {
      textDocument: { uri: DOCUMENT_URI, version: EDITS_PER_CYCLE },
      contentChanges: [{ text: 'const stale = 1;\nstale\n' }],
    });

    const symbols = await client.request('textDocument/documentSymbol', {
      textDocument: { uri: DOCUMENT_URI },
    });
    assert.deepEqual(symbolNames(symbols.result), [FINAL_SYMBOL]);

    const published = [...client.messages]
      .reverse()
      .find(
        (message) =>
          message.method === 'textDocument/publishDiagnostics' &&
          isDiagnosticsParams(message.params) &&
          message.params.uri === DOCUMENT_URI,
      );
    assert.ok(published, 'the final analysis should publish diagnostics');
    assert.ok(isDiagnosticsParams(published.params));
    assert.deepEqual(published.params.diagnostics, []);

    const finalSample = sampleRssKiB(client.pid);
    if (finalSample !== undefined) {
      rssSamples.push(finalSample);
    }

    assert.equal(await client.shutdownAndExit(), 0);
    assertCleanTransport(client);
    return rssSamples;
  } finally {
    await client.terminate();
  }
}

void test('bounded rapid edits and repeated lifecycles stay deterministic', async (t) => {
  for (let cycle = 1; cycle <= CYCLE_COUNT; cycle += 1) {
    const samples = await runLifecycleCycle();
    const first = samples[0];
    const last = samples.at(-1);
    if (first === undefined || last === undefined) {
      t.diagnostic(`soak cycle ${cycle}: RSS observation unavailable on ${process.platform}`);
      continue;
    }
    const growthKiB = last - first;
    t.diagnostic(
      `soak cycle ${cycle}: ${EDITS_PER_CYCLE} rapid edits, RSS ${first} -> ${last} KiB ` +
        `(${growthKiB >= 0 ? '+' : ''}${growthKiB} KiB across ${samples.length} samples)`,
    );
  }
});
