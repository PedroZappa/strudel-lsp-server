import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface WorkspaceScanToken {
  readonly isCancellationRequested: boolean;
}

export interface WorkspaceScanOptions {
  readonly maxFiles?: number;
  readonly maxFileBytes?: number;
  readonly maxDepth?: number;
  readonly token?: WorkspaceScanToken;
}

export interface WorkspaceFile {
  readonly uri: string;
  readonly text: string;
}

interface WorkspaceScanConfig {
  readonly maxFiles: number;
  readonly maxFileBytes: number;
  readonly maxDepth: number;
  readonly token: WorkspaceScanToken | undefined;
}

interface DirectoryEntry {
  readonly path: string;
  readonly depth: number;
}

const DEFAULT_MAX_FILES = 500;
const DEFAULT_MAX_FILE_BYTES = 1_000_000;
const DEFAULT_MAX_DEPTH = 12;
const FILE_EXTENSION = '.strudel';
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'coverage',
  'client',
  'server',
  '.git',
  '.vscode',
]);

function positiveInteger(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isInteger(value) || value <= 0 ? fallback : value;
}

function normalizeOptions(options: WorkspaceScanOptions): WorkspaceScanConfig {
  return {
    maxFiles: positiveInteger(options.maxFiles, DEFAULT_MAX_FILES),
    maxFileBytes: positiveInteger(options.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxDepth: positiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH),
    token: options.token,
  };
}

function isCancelled(token: WorkspaceScanToken | undefined): boolean {
  return token?.isCancellationRequested === true;
}

async function collectPaths(
  rootPath: string,
  budget: { remaining: number },
  config: WorkspaceScanConfig,
): Promise<string[]> {
  const paths: string[] = [];
  const queue: DirectoryEntry[] = [{ path: rootPath, depth: 0 }];

  while (queue.length > 0 && budget.remaining > 0 && !isCancelled(config.token)) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }

    let entries;
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (budget.remaining <= 0 || isCancelled(config.token)) {
        break;
      }

      const path = join(current.path, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name.startsWith('.') ||
          IGNORED_DIRECTORIES.has(entry.name) ||
          current.depth >= config.maxDepth
        ) {
          continue;
        }
        queue.push({ path, depth: current.depth + 1 });
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(FILE_EXTENSION)) {
        paths.push(path);
        budget.remaining -= 1;
      }
    }
  }

  return paths.sort((left, right) => left.localeCompare(right));
}

/**
 * Discovers `.strudel` files beneath the supplied workspace folder URIs with
 * explicit file-count, file-size and depth limits. Hidden and generated
 * directories are skipped. Errors for individual entries are ignored so one
 * inaccessible path cannot fail the whole symbol request.
 */
export async function readWorkspaceFiles(
  rootUris: readonly string[],
  options: WorkspaceScanOptions = {},
): Promise<readonly WorkspaceFile[]> {
  const config = normalizeOptions(options);
  const budget = { remaining: config.maxFiles };
  const files: WorkspaceFile[] = [];
  const seenUris = new Set<string>();

  for (const rootUri of rootUris) {
    if (isCancelled(config.token)) {
      break;
    }

    let rootPath: string;
    try {
      rootPath = fileURLToPath(rootUri);
    } catch {
      continue;
    }

    const paths = await collectPaths(rootPath, budget, config);
    for (const path of paths) {
      if (isCancelled(config.token)) {
        break;
      }

      const uri = pathToFileURL(path).href;
      if (seenUris.has(uri)) {
        continue;
      }
      seenUris.add(uri);

      let text: string;
      try {
        const details = await stat(path);
        if (details.size > config.maxFileBytes) {
          continue;
        }
        text = await readFile(path, 'utf8');
      } catch {
        continue;
      }
      if (Buffer.byteLength(text, 'utf8') > config.maxFileBytes) {
        continue;
      }
      files.push({ uri, text });
    }
  }

  return files;
}
