import assert from 'node:assert/strict';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  readWorkspaceFiles,
  type WorkspaceFile,
  type WorkspaceScanDirent,
  type WorkspaceScanFileSystem,
} from '../../src/lsp/index.js';

type FakeNodeKind = 'file' | 'directory' | 'symlink';

interface FakeNode {
  readonly kind: FakeNodeKind;
  readonly children?: readonly FakeEntry[];
  readonly text?: string;
  readonly size?: number;
  readonly statError?: boolean;
  readonly readError?: boolean;
}

interface FakeEntry {
  readonly name: string;
  readonly node: FakeNode;
}

interface RecordingFileSystem extends WorkspaceScanFileSystem {
  readonly reads: readonly string[];
}

const ROOT = resolve('/workspace');
const ROOT_URI = pathToFileURL(ROOT).href;

class FakeDirent implements WorkspaceScanDirent {
  readonly name: string;
  readonly kind: FakeNodeKind;

  constructor(name: string, kind: FakeNodeKind) {
    this.name = name;
    this.kind = kind;
  }

  isDirectory(): boolean {
    return this.kind === 'directory';
  }

  isFile(): boolean {
    return this.kind === 'file';
  }

  isSymbolicLink(): boolean {
    return this.kind === 'symlink';
  }
}

function file(text: string, overrides: Partial<FakeNode> = {}): FakeNode {
  return { kind: 'file', text, ...overrides };
}

function directory(children: readonly FakeEntry[]): FakeNode {
  return { kind: 'directory', children };
}

function entry(name: string, node: FakeNode): FakeEntry {
  return { name, node };
}

function createFileSystem(tree: ReadonlyMap<string, FakeNode>): RecordingFileSystem {
  const reads: string[] = [];

  function nodeAt(path: string): FakeNode | undefined {
    const key = resolve(path);
    const direct = tree.get(key);
    if (direct !== undefined) {
      return direct;
    }

    const relativePath = relative(ROOT, key);
    if (relativePath === '' || isAbsolute(relativePath) || relativePath.startsWith('..')) {
      return undefined;
    }

    let node = tree.get(ROOT);
    for (const segment of relativePath.split(sep).filter((part) => part.length > 0)) {
      if (node?.kind !== 'directory' || node.children === undefined) {
        return undefined;
      }
      const child = node.children.find((candidate) => candidate.name === segment);
      if (child === undefined) {
        return undefined;
      }
      node = child.node;
    }
    return node;
  }

  return {
    reads,
    readdir(path) {
      const node = nodeAt(path);
      if (node?.kind !== 'directory' || node.children === undefined) {
        return Promise.reject(new Error('unreadable directory'));
      }
      return Promise.resolve(
        node.children.map((child) => new FakeDirent(child.name, child.node.kind)),
      );
    },
    stat(path) {
      const node = nodeAt(path);
      if (node === undefined || node.statError === true) {
        return Promise.reject(new Error('unreadable file'));
      }
      return Promise.resolve({ size: node.size ?? Buffer.byteLength(node.text ?? '', 'utf8') });
    },
    readFile(path) {
      const key = resolve(path);
      reads.push(key);
      const node = nodeAt(key);
      if (node?.kind !== 'file' || node.readError === true) {
        return Promise.reject(new Error('unreadable file'));
      }
      return Promise.resolve(node.text ?? '');
    },
  };
}

function fileNames(files: readonly WorkspaceFile[]): string[] {
  return files.map((item) => item.uri.split('/').pop() ?? item.uri);
}

void test('workspace discovery skips symlinks and traversal entries with deterministic order', async () => {
  const nestedChildren = [entry('inside.strudel', file('f=1;'))];
  const tree = new Map<string, FakeNode>([
    [
      ROOT,
      directory([
        entry('a.strudel', file('a=1;')),
        entry('B.strudel', file('b=1;')),
        entry('_a.strudel', file('u=1;')),
        entry('linked.strudel', { kind: 'symlink' }),
        entry('linked-dir', { kind: 'symlink' }),
        entry('nested/../escape.strudel', file('escaped=1;')),
        entry('nested', directory(nestedChildren)),
      ]),
    ],
    [resolve(ROOT, 'escape.strudel'), file('escaped=1;')],
    [resolve(ROOT, 'nested'), directory(nestedChildren)],
  ]);

  const files = await readWorkspaceFiles([ROOT_URI], { fileSystem: createFileSystem(tree) });

  assert.deepEqual(fileNames(files), ['B.strudel', '_a.strudel', 'a.strudel', 'inside.strudel']);
  assert.equal(
    files.some((item) => item.uri.includes('escape')),
    false,
  );
  assert.equal(
    files.some((item) => item.uri.includes('linked')),
    false,
  );
});

void test('workspace discovery enforces depth and file-size limits', async () => {
  const nestedChildren = [
    entry('depth-one.strudel', file('o=1;')),
    entry('deeper', directory([entry('too-deep.strudel', file('d=1;'))])),
  ];
  const tree = new Map<string, FakeNode>([
    [
      ROOT,
      directory([
        entry('small.strudel', file('s=1;')),
        entry('large-stat.strudel', file('x=1;', { size: 1_000, readError: true })),
        entry('large-content.strudel', file('0123456789abcdef')),
        entry('nested', directory(nestedChildren)),
      ]),
    ],
    [resolve(ROOT, 'nested'), directory(nestedChildren)],
    [resolve(ROOT, 'nested', 'deeper'), directory([entry('too-deep.strudel', file('d=1;'))])],
  ]);
  const fileSystem = createFileSystem(tree);

  const files = await readWorkspaceFiles([ROOT_URI], {
    fileSystem,
    maxDepth: 1,
    maxFileBytes: 10,
  });

  assert.deepEqual(fileNames(files), ['depth-one.strudel', 'small.strudel']);
  assert.equal(fileSystem.reads.includes(resolve(ROOT, 'large-stat.strudel')), false);
});

void test('workspace discovery ignores unreadable paths and honours cancellation', async () => {
  const tree = new Map<string, FakeNode>([
    [
      ROOT,
      directory([
        entry('unreadable-stat.strudel', file('a=1;', { statError: true })),
        entry('unreadable-read.strudel', file('b=1;', { readError: true })),
        entry('good.strudel', file('g=1;')),
        entry('closed-dir', { kind: 'directory' }),
      ]),
    ],
  ]);
  const fileSystem = createFileSystem(tree);

  const files = await readWorkspaceFiles([ROOT_URI], { fileSystem });
  assert.deepEqual(fileNames(files), ['good.strudel']);

  const cancelled = await readWorkspaceFiles([ROOT_URI], {
    fileSystem,
    token: { isCancellationRequested: true },
  });
  assert.deepEqual(cancelled, []);
});
