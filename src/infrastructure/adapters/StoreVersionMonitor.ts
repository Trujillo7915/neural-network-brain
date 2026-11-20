import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface StoreVersionPaths {
  readonly localBrainPath?: string;
  readonly amemFilePath?: string;
  readonly mem0Home?: string;
  readonly eccHome?: string;
  readonly enableExternalStores?: boolean;
}

function statSignature(filePath: string): string {
  try {
    const st = fs.statSync(filePath);
    return `${filePath}:${st.size}:${Math.floor(st.mtimeMs)}`;
  } catch {
    return `${filePath}:missing`;
  }
}

function collectEccSignatures(dirPath: string, out: string[], depth = 0): void {
  if (depth > 4) return;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectEccSignatures(full, out, depth + 1);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(statSignature(full));
    }
  }
}

export class StoreVersionMonitor {
  private readonly paths: StoreVersionPaths;

  constructor(paths: StoreVersionPaths) {
    this.paths = paths;
  }

  getRevisionToken(): string {
    const signatures: string[] = [];
    if (this.paths.localBrainPath) {
      signatures.push(statSignature(this.paths.localBrainPath));
    }
    if (this.paths.enableExternalStores) {
      if (this.paths.amemFilePath) {
        signatures.push(statSignature(this.paths.amemFilePath));
      }
      if (this.paths.mem0Home) {
        signatures.push(
          statSignature(path.join(this.paths.mem0Home, 'history.db')),
          statSignature(path.join(this.paths.mem0Home, 'history.db-wal')),
          statSignature(path.join(this.paths.mem0Home, 'qdrant', 'collection', 'antigravity_memories', 'storage.sqlite')),
        );
      }
      if (this.paths.eccHome) {
        collectEccSignatures(this.paths.eccHome, signatures);
      }
    }
    return crypto.createHash('sha1').update(signatures.join('|')).digest('hex').slice(0, 16);
  }
}
