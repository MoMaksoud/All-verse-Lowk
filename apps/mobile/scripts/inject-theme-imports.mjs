#!/usr/bin/env node
/**
 * One-shot fixer for files that reference `colors.` / `palette.` but are
 * missing the `constants/theme` import.
 *
 * The main codemod (migrate-to-theme.mjs) successfully substituted hex/rgba
 * values for tokens, but its import-injection regex required `import` and
 * `from 'react-native'` on the same line — which doesn't match multi-line
 * import blocks. This script walks the mobile tree and fixes any file that
 * uses `colors`/`palette` identifiers without the corresponding import.
 *
 * It is idempotent: files that already have the correct import are skipped.
 *
 * Usage:
 *   node scripts/inject-theme-imports.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['app', 'components'];

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      await walk(full, out);
    } else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function themeRelativePath(filePath) {
  const fileDir = path.dirname(filePath);
  const themePath = path.join(MOBILE_ROOT, 'constants', 'theme');
  let rel = path.relative(fileDir, themePath);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.split(path.sep).join('/');
}

/**
 * Parse the existing theme import (if any) and return:
 *   { hasImport, importedNames: Set, importFullMatch, importStart, importEnd }
 */
function parseThemeImport(src) {
  const re = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]*constants\/theme['"];?/;
  const m = src.match(re);
  if (!m) return { hasImport: false, importedNames: new Set() };
  const names = new Set(
    m[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean),
  );
  return {
    hasImport: true,
    importedNames: names,
    importFullMatch: m[0],
  };
}

/**
 * Inject or extend the theme import so that `needed` names are all present.
 * Insertion point: right after the closing `from 'react-native';` line of the
 * first react-native import (handles multi-line imports correctly because we
 * anchor on the `from` clause).
 */
function ensureThemeImport(src, needed, relPath) {
  const { hasImport, importedNames, importFullMatch } = parseThemeImport(src);

  if (hasImport) {
    const missing = [...needed].filter((n) => !importedNames.has(n));
    if (missing.length === 0) return { out: src, changed: false };
    const merged = [...importedNames, ...missing].join(', ');
    const newImport = `import { ${merged} } from '${relPath}';`;
    return { out: src.replace(importFullMatch, newImport), changed: true };
  }

  // No theme import. Insert one after the react-native import's `from` line.
  const newImport = `import { ${[...needed].join(', ')} } from '${relPath}';`;

  // Anchor on `from 'react-native';` (the closing line of any RN import).
  const rnRegex = /(from\s+['"]react-native['"]\s*;?[ \t]*\n)/;
  if (rnRegex.test(src)) {
    return {
      out: src.replace(rnRegex, `$1${newImport}\n`),
      changed: true,
    };
  }

  // Fallback: insert after the first top-level import statement.
  const firstImportRegex = /((?:^|\n)import[\s\S]*?;[ \t]*\n)/;
  if (firstImportRegex.test(src)) {
    return {
      out: src.replace(firstImportRegex, `$1${newImport}\n`),
      changed: true,
    };
  }

  // Worst case: prepend.
  return { out: `${newImport}\n${src}`, changed: true };
}

async function processFile(filePath) {
  const rel = path.relative(MOBILE_ROOT, filePath);
  if (rel === path.join('constants', 'theme.ts')) return { skipped: true, rel };

  const src = await readFile(filePath, 'utf8');

  const needed = new Set();
  // Only count identifier references to colors/palette (followed by a dot or
  // destructuring). This avoids triggering on words like "colors" in comments.
  if (/\bcolors\./.test(src)) needed.add('colors');
  if (/\bpalette\./.test(src)) needed.add('palette');

  if (needed.size === 0) return { skipped: true, rel, reason: 'no-tokens' };

  const relPath = themeRelativePath(filePath);
  const { out, changed } = ensureThemeImport(src, needed, relPath);

  if (!changed) return { skipped: true, rel, reason: 'already-imported' };

  await writeFile(filePath, out, 'utf8');
  return { changed: true, rel, needed: [...needed] };
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    await walk(path.join(MOBILE_ROOT, dir), files);
  }

  const results = [];
  for (const f of files) {
    try {
      results.push(await processFile(f));
    } catch (err) {
      console.error(`✗ ${path.relative(MOBILE_ROOT, f)}: ${err.message}`);
    }
  }

  const changed = results.filter((r) => r.changed);
  console.log(`✓ Injected imports in ${changed.length} file(s):`);
  for (const r of changed) {
    console.log(`  • ${r.rel}  (${r.needed.join(', ')})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
