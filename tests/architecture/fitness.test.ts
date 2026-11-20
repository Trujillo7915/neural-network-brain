import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_ROOT = path.join(ROOT_DIR, 'src');

function collectFiles(dir: string, extensions: readonly string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe('Architecture, Licensing & Sanitization Fitness Functions', () => {
  it('Domain layer has ZERO imports from application, infrastructure, presentation, web or Node IO', () => {
    const domainFiles = collectFiles(path.join(SRC_ROOT, 'domain'), ['.ts', '.tsx']);
    expect(domainFiles.length).toBeGreaterThan(0);

    const forbidden = [
      /from\s+['"][^'"]*application/,
      /from\s+['"][^'"]*infrastructure/,
      /from\s+['"][^'"]*presentation/,
      /from\s+['"][^'"]*web/,
      /from\s+['"]node:(fs|http|child_process|path)/,
    ];

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(content, `Forbidden domain import in ${file}`).not.toMatch(pattern);
      }
    }
  });

  it('Application layer depends ONLY on Domain (zero infrastructure/presentation imports)', () => {
    const appFiles = collectFiles(path.join(SRC_ROOT, 'application'), ['.ts', '.tsx']);
    expect(appFiles.length).toBeGreaterThan(0);

    for (const file of appFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `Application imports infrastructure in ${file}`).not.toMatch(/from\s+['"][^'"]*infrastructure/);
      expect(content, `Application imports presentation in ${file}`).not.toMatch(/from\s+['"][^'"]*presentation/);
    }
  });

  it('Every source file respects the 800-line maintainability ceiling and bans console.log in backend', () => {
    const allFiles = collectFiles(SRC_ROOT, ['.ts', '.tsx']);
    expect(allFiles.length).toBeGreaterThan(0);

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lineCount = content.split('\n').length;
      expect(lineCount, `File exceeds 800 lines: ${file}`).toBeLessThanOrEqual(800);

      if (!file.includes(`${path.sep}web${path.sep}`)) {
        expect(content, `console.log prohibited in backend: ${file}`).not.toMatch(/\bconsole\.log\s*\(/);
      }
    }
  });

  it('External adapters enforce strict read-only invariant (only LocalJsonStoreAdapter writes locally)', () => {
    const readOnlyAdapters = [
      path.join(SRC_ROOT, 'infrastructure', 'adapters', 'AgenticMemoryAdapter.ts'),
      path.join(SRC_ROOT, 'infrastructure', 'adapters', 'Mem0Adapter.ts'),
      path.join(SRC_ROOT, 'infrastructure', 'adapters', 'EccVaultAdapter.ts'),
    ];

    for (const file of readOnlyAdapters) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `Write operation forbidden in external adapter ${file}`).not.toMatch(/\b(writeFile|appendFile|unlink|rmSync|rmdir)\b/);
      expect(content, `Unsafe shell exec forbidden in adapter ${file}`).not.toMatch(/\bexec\s*\(/);
    }
  });

  it('Includes official Apache-2.0 LICENSE and copyright NOTICE files', () => {
    const licensePath = path.join(ROOT_DIR, 'LICENSE');
    const noticePath = path.join(ROOT_DIR, 'NOTICE');

    expect(fs.existsSync(licensePath)).toBe(true);
    expect(fs.existsSync(noticePath)).toBe(true);

    const license = fs.readFileSync(licensePath, 'utf8');
    const notice = fs.readFileSync(noticePath, 'utf8');

    expect(license).toContain('Apache License');
    expect(license).toContain('Version 2.0, January 2004');
    expect(notice).toContain('Fabián Ricardo Trujillo González');
  });

  it('Public repository contains ZERO private personal/project data across src, docs, database, data and README', () => {
    const privateMarkers = [
      ['resi', 'complex'].join('-'),
      ['3239', '188'].join(''),
      ['barberia', 'lopez'].join('-'),
      ['proptech', 'enterprise', 'saas'].join('-'),
      ['C:\\Users', 'USUARIO'].join('\\'),
      ['Alexandra', 'Vargass'].join(''),
      ['Felix', 'JRbyte'].join(''),
      ['julian', 'lp-hub'].join(''),
    ];

    const targets = [
      ...collectFiles(SRC_ROOT, ['.ts', '.tsx', '.css', '.html']),
      ...collectFiles(path.join(ROOT_DIR, 'docs'), ['.md', '.yaml', '.json']),
      ...collectFiles(path.join(ROOT_DIR, 'database'), ['.sql']),
      ...collectFiles(path.join(ROOT_DIR, 'data'), ['.json']),
      path.join(ROOT_DIR, 'README.md'),
    ];

    for (const file of targets) {
      const text = fs.readFileSync(file, 'utf8');
      for (const marker of privateMarkers) {
        expect(text, `Private marker '${marker}' leaked in ${file}`).not.toContain(marker);
      }
    }
  });
});
