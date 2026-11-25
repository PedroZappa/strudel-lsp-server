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
  DiagnosticSeverity,
} from 'vscode-languageserver/node';

import {
  TextDocument,
} from 'vscode-languageserver-textdocument';

import { createServer, Server, Socket } from 'net';
import { MessageReader, MessageWriter } from 'vscode-languageserver-protocol/node';

const jsonrpc = require('vscode-jsonrpc');
const StreamMessageReader = jsonrpc.StreamMessageReader;
const StreamMessageWriter = jsonrpc.StreamMessageWriter;

const TCP_PORT = 5007;

interface StrudelFunction {
  label: string;
  detail: string;
  documentation: string;
}

const STRUDEL_FUNCTIONS: StrudelFunction[] = [
  { label: 'sound', detail: 'sound(pattern: string)', documentation: 'Play a sample pattern. Examples: "bd", "hh", "sd", "bd hh sd"' },
  { label: 's', detail: 's(pattern: string)', documentation: 'Alias for sound(). Play a sample pattern.' },
  { label: 'note', detail: 'note(pattern: string)', documentation: 'Play pitched notes. Examples: "c4", "c4 e4 g4", "c3 [e3 g3]"' },
  { label: 'n', detail: 'n(pattern: string)', documentation: 'Play notes by number. Use with .scale() for musical notes.' },
  { label: 'fast', detail: 'fast(multiplier: number)', documentation: 'Speed up pattern by multiplier (e.g., 2 = twice as fast).' },
  { label: 'slow', detail: 'slow(divisor: number)', documentation: 'Slow down pattern by divisor (e.g., 2 = half speed).' },
  { label: 'stack', detail: 'stack(...patterns: Pattern[])', documentation: 'Play multiple patterns simultaneously.' },
  { label: 'cat', detail: 'cat(...patterns: Pattern[])', documentation: 'Concatenate patterns, playing one after another.' },
  { label: 'seq', detail: 'seq(...values: any[])', documentation: 'Sequence values over time.' },
  { label: 'fastcat', detail: 'fastcat(...patterns: Pattern[])', documentation: 'Fast concatenation of patterns.' },
  { label: 'slowcat', detail: 'slowcat(...patterns: Pattern[])', documentation: 'Slow concatenation of patterns.' },
  { label: 'jux', detail: 'jux(func: Function)', documentation: 'Apply transformation to every other cycle (stereo).' },
  { label: 'juxBy', detail: 'juxBy(amount: number, func: Function)', documentation: 'Apply transformation with stereo offset.' },
  { label: 'rev', detail: 'rev()', documentation: 'Reverse the pattern.' },
  { label: 'room', detail: 'room(size: number)', documentation: 'Add reverb. Size from 0 to 1.' },
  { label: 'delay', detail: 'delay(time: number)', documentation: 'Add delay. Time in seconds.' },
  { label: 'delaytime', detail: 'delaytime(time: number)', documentation: 'Set delay time.' },
  { label: 'cutoff', detail: 'cutoff(frequency: number)', documentation: 'Set low-pass filter cutoff frequency in Hz.' },
  { label: 'gain', detail: 'gain(value: number)', documentation: 'Set volume. Values from 0 to 1.' },
  { label: 'pan', detail: 'pan(value: number)', documentation: 'Stereo pan. 0 = left, 0.5 = center, 1 = right.' },
  { label: 'speed', detail: 'speed(value: number)', documentation: 'Playback speed of sample. 1 = normal, 0.5 = half speed.' },
  { label: 'shape', detail: 'shape(amount: number)', documentation: 'Apply waveshaper distortion. 0 to 1.' },
  { label: 'vowel', detail: 'vowel(vowel: string)', documentation: 'Apply vowel filter. a, e, i, o, u' },
  { label: 'crush', detail: 'crush(bits: number)', documentation: 'Bitcrusher effect. Lower bits = more distortion.' },
  { label: 'coarse', detail: 'coarse(bits: number)', documentation: 'Reduce sample quality. 1-16.' },
  { label: 'loop', detail: 'loop(loopCount: number)', documentation: 'Loop sample N times.' },
  { label: 'unit', detail: 'unit(value: string)', documentation: 'Set unit type: "c" (cycle), "s" (second), "r" (rate).' },
  { label: 'stride', detail: 'stride(samples: number)', documentation: 'Sample stride for granular synthesis.' },
  { label: 'begin', detail: 'begin(start: number)', documentation: 'Start position in sample (0 to 1).' },
  { label: 'end', detail: 'end(end: number)', documentation: 'End position in sample (0 to 1).' },
  { label: 'clip', detail: 'clip(value: number)', documentation: 'Clip value to 0-1 range.' },
  { label: 'legato', detail: 'legato(sustain: number)', documentation: 'Note sustain time.' },
  { label: 'sustain', detail: 'sustain(value: number)', documentation: 'Note sustain time.' },
  { label: 'velocity', detail: 'velocity(value: number)', documentation: 'Note velocity/velocity.' },
  { label: 'velocityUp', detail: 'velocityUp(value: number)', documentation: 'Increase velocity by value.' },
  { label: 'velocityDown', detail: 'velocityDown(value: number)', documentation: 'Decrease velocity by value.' },
  { label: 'arp', detail: 'arp(pattern: string)', documentation: 'Arpeggiate pattern: "up", "down", "updown", "downup", "pink".' },
  { label: 'chop', detail: 'chop(amount: number)', documentation: 'Chop pattern into N pieces per cycle.' },
  { label: 'striate', detail: 'striate(size: number)', documentation: 'Granular synthesis effect.' },
  { label: 'rands', detail: 'rands()', documentation: 'Random values each cycle.' },
  { label: 'irand', detail: 'irand(max: number)', documentation: 'Random integer from 0 to max.' },
  { label: 'rand', detail: 'rand()', documentation: 'Random value 0 to 1 each cycle.' },
  { label: 'sine', detail: 'sine()', documentation: 'Sine wave pattern.' },
  { label: 'cosine', detail: 'cosine()', documentation: 'Cosine wave pattern.' },
  { label: 'saw', detail: 'saw()', documentation: 'Sawtooth wave pattern.' },
  { label: 'square', detail: 'square()', documentation: 'Square wave pattern.' },
  { label: 'tri', detail: 'tri()', documentation: 'Triangle wave pattern.' },
  { label: 'range', detail: 'range(min: number, max: number)', documentation: 'Map sine/cosine to range.' },
  { label: 'scale', detail: 'scale(name: string)', documentation: 'Set musical scale. Example: "C:minor", "A:pentatonic".' },
  { label: 'quantize', detail: 'quantize(value: number)', documentation: 'Quantize value to nearest step.' },
  { label: 'swing', detail: 'swing(amount: number)', documentation: 'Add swing. 0 = no swing, 1 = heavy swing.' },
  { label: 'sometimes', detail: 'sometimes(func: Function)', documentation: 'Apply function randomly 50% of the time.' },
  { label: 'sometimesBy', detail: 'sometimesBy(probability: number, func: Function)', documentation: 'Apply function with probability.' },
  { label: 'rarely', detail: 'rarely(func: Function)', documentation: 'Apply function rarely (10% chance).' },
  { label: 'often', detail: 'often(func: Function)', documentation: 'Apply function often (90% chance).' },
  { label: 'never', detail: 'never(func: Function)', documentation: 'Never apply function (0% chance).' },
  { label: 'always', detail: 'always(func: Function)', documentation: 'Always apply function (100% chance).' },
  { label: 'every', detail: 'every(cycle: number, func: Function)', documentation: 'Apply function every N cycles.' },
  { label: 'when', detail: 'when(test: Function, func: Function)', documentation: 'Apply function when test is true.' },
  { label: 'if', detail: 'if(test: Function, then: Function, else: Function)', documentation: 'Conditional pattern transformation.' },
  { label: 'fold', detail: 'fold(amount: number)', documentation: 'Fold pattern back on itself.' },
  { label: 'mirror', detail: 'mirror()', documentation: 'Mirror pattern.' },
  { label: 'rot', detail: 'rot(shift: number)', documentation: 'Rotate pattern by shift amount.' },
  { label: 'inside', detail: 'inside(func: Function)', documentation: 'Apply function inside pattern.' },
  { label: 'outside', detail: 'outside(func: Function)', documentation: 'Apply function outside pattern.' },
  { label: 'layer', detail: 'layer(...funcs: Function[])', documentation: 'Layer multiple transformations.' },
  { label: 'linger', detail: 'linger(duration: number)', documentation: 'Linger on pattern for duration.' },
  { label: 'take', detail: 'take(count: number)', documentation: 'Take first N values.' },
  { label: 'drop', detail: 'drop(count: number)', documentation: 'Drop first N values.' },
  { label: 'ply', detail: 'ply(amount: number)', documentation: 'Multiply each value into multiple cycles.' },
  { label: 'repeat', detail: 'repeat(n: number)', documentation: 'Repeat each value N times.' },
  { label: 'restart', detail: 'restart()', documentation: 'Restart pattern from beginning.' },
  { label: 'discrete', detail: 'discrete()', documentation: 'Discretize pattern to discrete events.' },
  { label: 'continuous', detail: 'continuous()', documentation: 'Make pattern continuous.' },
  { label: 'press', detail: 'press()', documentation: 'Press key on keyboard.' },
  { label: 'midi', detail: 'midi(note: number)', documentation: 'Send MIDI note.' },
  { label: 'midinote', detail: 'midinote(note: string)', documentation: 'Send MIDI note by name (e.g., "C4").' },
  { label: 'osc', detail: 'osc(addr: string)', documentation: 'Send OSC message.' },
  { label: ' cps', detail: 'cps(bpm: number)', documentation: 'Set cycles per second (tempo).' },
  { label: 'bpm', detail: 'bpm(bpm: number)', documentation: 'Set beats per minute.' },
  { label: 'get', detail: 'get(key: string)', documentation: 'Get value from pattern state.' },
  { label: 'set', detail: 'set(key: string, value: any)', documentation: 'Set value in pattern state.' },
  { label: 'withState', detail: 'withState(init: any, func: Function)', documentation: 'Initialize pattern with state.' },
  { label: 'reset', detail: 'reset()', documentation: 'Reset pattern to beginning.' },
  { label: 'stop', detail: 'stop()', documentation: 'Stop pattern.' },
  { label: 'play', detail: 'play()', documentation: 'Start pattern.' },
  { label: 'pause', detail: 'pause()', documentation: 'Pause pattern.' },
  { label: 'solo', detail: 'solo()', documentation: 'Solo this pattern.' },
  { label: 'unsolo', detail: 'unsolo()', documentation: 'Unsolo this pattern.' },
  { label: 'mute', detail: 'mute()', documentation: 'Mute this pattern.' },
  { label: 'unmute', detail: 'unmute()', documentation: 'Unmute this pattern.' },
  { label: 'soloAll', detail: 'soloAll()', documentation: 'Solo all patterns.' },
  { label: 'unsoloAll', detail: 'unsoloAll()', documentation: 'Unsolo all patterns.' },
  { label: 'bank', detail: 'bank(name: string)', documentation: 'Load sample bank. Example: "Drums".' },
  { label: 'samples', detail: 'samples(url: string)', documentation: 'Load samples from URL.' },
  { label: 'soundUrl', detail: 'soundUrl(url: string)', documentation: 'Load sound from URL.' },
  { label: 'load', detail: 'load(url: string)', documentation: 'Load audio file.' },
  { label: ' ASAP', detail: 'ASAP()', documentation: 'Load all samples immediately.' },
  { label: 'late', detail: 'late( seconds: number)', documentation: 'Add latency to pattern.' },
  { label: 'early', detail: 'early(seconds: number)', documentation: 'Subtract latency from pattern.' },
  { label: 'latency', detail: 'latency(func: Function)', documentation: 'Apply latency function.' },
  { label: 'channel', detail: 'channel(n: number)', documentation: 'Send to audio channel N.' },
  { label: 'out', detail: 'out(n: number)', documentation: 'Send to output N.' },
  { label: 'monitor', detail: 'monitor()', documentation: 'Monitor this pattern.' },
];

const STRUDEL_SAMPLES = [
  'bd', 'sd', 'hh', 'cp', 'ht', 'mt', 'lt', 'hc', 'ho', 'cl', 'cb', 'cr', 'clap', 'rim',
  '808', '909', 'kick', 'snare', 'hihat', 'openhihat', 'clap', 'tom', 'cymbal', 'cowbell',
  'conga', 'bongo', 'timbale', 'shaker', 'cabasa', 'guiro', 'maracas', 'claves', 'woodblock',
  'dust', 'glass', 'metal', 'plastic', 'wood', 'paper', 'noise', 'silence',
  'arpy', 'bass', 'bass2', 'dhol', 'drum', 'drum2', 'drums', 'gabba', 'glitch', 'grass',
  'hits', 'industrial', 'jazz', 'jungbass', 'mt46', 'pad', 'psr', 'rave', 'sax', 'sitar',
  'space', 'speech', 'tabla', 'tabla2', 'teddy', 'titan', 'trap', 'trihip', 'vocals',
];

function createServerConnection(socket: Socket): ReturnType<typeof createConnection> {
  const reader = new StreamMessageReader(socket);
  const writer = new StreamMessageWriter(socket);
  return createConnection(reader, writer) as ReturnType<typeof createConnection>;
}

function setupServer(conn: ReturnType<typeof createConnection>, socket: Socket) {
  const documents = new TextDocuments(TextDocument);

  let hasConfigurationCapability = false;
  let hasWorkspaceFolderCapability = false;
  let hasDiagnosticRelatedInformationCapability = false;

  conn.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

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
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.', '(', '"', "'"]
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

    console.error(`[Strudel LSP] Initialized. Client: ${params.clientInfo?.name || 'unknown'}`);
    return result;
  });

  conn.onInitialized(() => {
    console.error(`[Strudel LSP] Server initialized and ready`);
  });

  conn.onDidChangeConfiguration(() => {
    console.error(`[Strudel LSP] Configuration changed`);
  });

  conn.onDidChangeWatchedFiles(() => {
    console.error(`[Strudel LSP] File change event`);
  });

  conn.languages.diagnostics.on(async (params) => {
    const doc = documents.get(params.textDocument.uri);
    if (doc !== undefined) {
      return {
        kind: DocumentDiagnosticReportKind.Full,
        items: await validateTextDocument(doc)
      } satisfies DocumentDiagnosticReport;
    }
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: []
    } satisfies DocumentDiagnosticReport;
  });

  async function validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
    const text: string = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    const unclosedBracketRegex = /[\[\]\(\{]/g;
    let match;
    while ((match = unclosedBracketRegex.exec(text)) !== null) {
      const char = match[0];
      const openBrackets = '([{';
      const closeBrackets = ')]}';
      const isOpen = openBrackets.includes(char);
      const matchingClose = openBrackets.indexOf(char) >= 0 ? closeBrackets[openBrackets.indexOf(char)] : null;

      let count = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === char) count++;
        if (matchingClose && text[i] === matchingClose) count--;
      }

      if (count > 0 && isOpen) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: textDocument.positionAt(match.index),
            end: textDocument.positionAt(match.index + 1)
          },
          message: `Unclosed bracket: ${char}`,
          source: 'strudel'
        });
      }
    }

    return diagnostics;
  }

  conn.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
    console.error(`[Strudel LSP] Completion request received at position: ${params.position.line}:${params.position.character}`);
    const items: CompletionItem[] = [];

    STRUDEL_FUNCTIONS.forEach((fn, index) => {
      items.push({
        label: fn.label,
        kind: CompletionItemKind.Function,
        detail: fn.detail,
        documentation: fn.documentation,
        data: index + 1
      });
    });

    STRUDEL_SAMPLES.forEach((sample, index) => {
      items.push({
        label: sample,
        kind: CompletionItemKind.Snippet,
        detail: `Sample: ${sample}`,
        documentation: `Play the "${sample}" sample.`,
        insertText: `"${sample}"`,
        data: STRUDEL_FUNCTIONS.length + index + 1
      });
    });

    items.push({
      label: 'mini-notation',
      kind: CompletionItemKind.Snippet,
      detail: 'Mini-notation pattern',
      documentation: 'Strudel mini-notation: space = sequential, comma = stack, angle brackets = polyrhythm, square brackets = grouping',
      insertText: '"${1:bd} ${2:hh} ${3:sd}"',
      insertTextFormat: 2,
      data: 9999
    });

    return items;
  });

  conn.onCompletionResolve((item: CompletionItem): CompletionItem => {
    console.error(`[Strudel LSP] Completion resolve request for: ${item.label}`);
    if (item.data === 9999) {
      item.detail = 'Mini-notation pattern template';
      item.documentation = 'Strudel mini-notation examples:\n' +
        '"bd hh sd" - sequential\n' +
        '"bd, hh, sd" - simultaneous (stack)\n' +
        '"bd [hh sd]" - grouped\n' +
        '"bd <hh sd>" - polyrhythm\n' +
        '"bd*2" - speed up\n' +
        '"bd/2" - slow down';
    }
    return item;
  });

  // Hover handler
  conn.onHover((params: TextDocumentPositionParams) => {
    console.error(`[Strudel LSP] Hover request at position: ${params.position.line}:${params.position.character}`);
    const text = documents.get(params.textDocument.uri)?.getText() || '';
    
    // Find the word at cursor
    const lines = text.split('\n');
    const line = lines[params.position.line] || '';
    const wordMatch = line.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
    const word = wordMatch ? wordMatch[0] : '';

    // Find matching function
    const fn = STRUDEL_FUNCTIONS.find(f => f.label === word);
    if (fn) {
      return {
        contents: {
          kind: 'markdown',
          value: `**${fn.label}**\n\n${fn.detail}\n\n${fn.documentation}`
        }
      };
    }

    return {
      contents: {
        kind: 'markdown',
        value: 'Strudel LSP - Type a function name to see docs'
      }
    };
  });

  // Definition handler
  conn.onDefinition((params: TextDocumentPositionParams) => {
    console.error(`[Strudel LSP] Definition request at position: ${params.position.line}:${params.position.character}`);
    return null;
  });

  conn.onReferences((params: TextDocumentPositionParams) => {
    console.error(`[Strudel LSP] References request at position: ${params.position.line}:${params.position.character}`);
    return [];
  });

  documents.listen(conn);
  conn.listen();

  if (socket) {
    socket.on('close', () => {
      console.error(`[Strudel LSP] Client disconnected`);
    });
  }
}

function startTcpServer(port: number) {
  const server: Server = createServer((socket: Socket) => {
    console.error(`[Strudel LSP] Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    const conn = createServerConnection(socket);
    setupServer(conn, socket);
  });

  server.listen(port, () => {
    console.error(`[Strudel LSP] TCP server listening on port ${port}`);
    console.error(`[Strudel LSP] Connect with: node --inspect=9229 server.js (for debugging)`);
  });

  server.on('error', (err: Error) => {
    console.error(`[Strudel LSP] Server error: ${err.message}`);
    process.exit(1);
  });
}

function startStdioServer() {
  console.error(`[Strudel LSP] Starting in stdio mode (Neovim compatible)`);
  const reader = new StreamMessageReader(process.stdin as unknown as NodeJS.ReadableStream);
  const writer = new StreamMessageWriter(process.stdout as unknown as NodeJS.WritableStream);
  const conn = createConnection(reader, writer) as ReturnType<typeof createConnection>;
  setupServer(conn, null as unknown as Socket);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--tcp')) {
  console.error(`[Strudel LSP] Starting in TCP mode`);
  startTcpServer(TCP_PORT);
} else {
  console.error(`[Strudel LSP] Starting in stdio mode (default)`);
  startStdioServer();
}
