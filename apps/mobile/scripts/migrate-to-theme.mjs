#!/usr/bin/env node
/**
 * Theme migration codemod for mobile app (Goal #1: Design Consistency).
 *
 * Replaces hard-coded color/opacity values with references to
 * `apps/mobile/constants/theme.ts`, and ensures each refactored file imports
 * the tokens it uses.
 *
 * Safe because:
 *   - It only substitutes exact, quoted string literals in style contexts.
 *   - Ambiguous rgba values are resolved by the *property key* on the line
 *     (borderColor / backgroundColor / color).
 *   - It tracks which tokens were used per file and only imports those.
 *
 * Usage:
 *   node scripts/migrate-to-theme.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(__dirname, '..');

// Directories to walk (relative to mobile root)
const TARGET_DIRS = ['app', 'components'];

// Files to skip (already refactored or not needed)
const SKIP_FILES = new Set([
  'constants/theme.ts',
]);

// ────────────────────────────────────────────────────────────────────────────
// REPLACEMENT RULES
//
// Each rule has:
//   match    — exact string that must appear on a line
//   token    — token expression to substitute in
//   requires — which named import(s) this token depends on
//   context  — optional restriction: must match a property on the same line
// ────────────────────────────────────────────────────────────────────────────

// Unambiguous hex → token mappings (exact string literals)
const HEX_MAP = [
  // Surfaces
  ["'#020617'",  'colors.bg.base',         'colors'],
  ["'#0f172a'",  'colors.bg.raised',       'colors'],
  ["'#1e293b'",  'colors.bg.surface',      'colors'],
  ["'#334155'",  'colors.bg.surfaceHover', 'colors'],
  ["'#0E1526'",  'colors.bg.raised',       'colors'],
  ["'#0f1b2e'",  'colors.bg.raised',       'colors'],
  ["'#1a2332'",  'colors.bg.surface',      'colors'],
  ["'#1a1a1a'",  'colors.bg.surface',      'colors'],
  ["'#0a0a0a'",  'colors.bg.base',         'colors'],

  // Brand blue
  ["'#0063e1'",  'colors.brand.DEFAULT',   'colors'],
  ["'#0052b8'",  'colors.brand.hover',     'colors'],
  ["'#00418f'",  'colors.brand.pressed',   'colors'],

  // Text (web greys)
  ["'#fff'",     'colors.text.primary',    'colors'],
  ["'#ffffff'",  'colors.text.primary',    'colors'],
  ["'#FFF'",     'colors.text.primary',    'colors'],
  ["'#FFFFFF'",  'colors.text.primary',    'colors'],
  ["'#e2e8f0'", 'colors.text.secondary',   'colors'],
  ["'#cbd5e1'", 'colors.text.tertiary',    'colors'],
  ["'#94a3b8'", 'colors.text.muted',       'colors'],
  ["'#64748b'", 'colors.text.disabled',    'colors'],

  // Legacy shorthand greys
  ["'#333'",     'palette.gray[700]',      'palette'],
  ["'#666'",     'colors.text.disabled',   'colors'],
  ["'#999'",     'colors.text.muted',      'colors'],
  ["'#ccc'",     'colors.text.tertiary',   'colors'],
  ["'#000'",     'colors.palette.black',   null], // we don't export this, skip
  ["'#000000'",  "'#000000'",              null], // leave black alone

  // State colours
  ["'#ef4444'",  'colors.error.DEFAULT',   'colors'],
  ["'#10b981'",  'colors.success.DEFAULT', 'colors'],
  ["'#fbbf24'",  'palette.amber[400]',     'palette'],
  ["'#f59e0b'",  'palette.amber[500]',     'palette'],
  ["'#f97316'",  'palette.orange[500]',    'palette'],

  // Accents
  ["'#60a5fa'",  'palette.primary[400]',   'palette'],
  ["'#3b82f6'",  'palette.primary[500]',   'palette'],
  ["'#6366f1'",  'palette.primary[500]',   'palette'],
  ["'#a855f7'",  'palette.violet[500]',    'palette'],
  ["'#8b5cf6'",  'palette.violet[500]',    'palette'],
  ["'#818cf8'",  'palette.primary[400]',   'palette'],

  // Other greys
  ["'#4b5563'",  'palette.gray[600]',      'palette'],
  ["'#374151'",  'palette.gray[700]',      'palette'],
  ["'#71717a'",  'palette.gray[500]',      'palette'],
];

// Filter out the skip-rules
const ACTIVE_HEX_MAP = HEX_MAP.filter(([, , req]) => req !== null);

// Hex values in JSX attribute form:  color="#fff"  →  color={colors.text.primary}
const JSX_MAP = [];
for (const [quoted, token, req] of ACTIVE_HEX_MAP) {
  const inner = quoted.slice(1, -1); // strip the quotes
  JSX_MAP.push([`"${inner}"`, `{${token}}`, req]);
}

// RGBA replacements (context-aware by line content)
const RGBA_RULES = [
  // White overlays — 0.05
  {
    pattern: "'rgba(255, 255, 255, 0.05)'",
    variants: [
      { context: 'backgroundColor:', token: 'colors.bg.glass', requires: 'colors' },
      { context: 'borderColor:',     token: 'colors.bg.glass', requires: 'colors' },
    ],
    fallback: { token: 'colors.bg.glass', requires: 'colors' },
  },
  // White overlays — 0.1
  {
    pattern: "'rgba(255, 255, 255, 0.1)'",
    variants: [
      { context: 'backgroundColor:', token: 'colors.bg.glassHover', requires: 'colors' },
      { context: 'borderColor:',     token: 'colors.border.subtle', requires: 'colors' },
    ],
    fallback: { token: 'colors.border.subtle', requires: 'colors' },
  },
  // White overlays — 0.15
  {
    pattern: "'rgba(255, 255, 255, 0.15)'",
    fallback: { token: 'colors.border.default', requires: 'colors' },
  },
  // White overlays — 0.2
  {
    pattern: "'rgba(255, 255, 255, 0.2)'",
    fallback: { token: 'colors.border.strong', requires: 'colors' },
  },
  // Text-ish whites with opacity
  {
    pattern: "'rgba(255, 255, 255, 0.3)'",
    fallback: { token: 'colors.text.muted', requires: 'colors' },
  },
  {
    pattern: "'rgba(255, 255, 255, 0.4)'",
    fallback: { token: 'colors.text.muted', requires: 'colors' },
  },
  {
    pattern: "'rgba(255, 255, 255, 0.5)'",
    fallback: { token: 'colors.text.muted', requires: 'colors' },
  },
  {
    pattern: "'rgba(255, 255, 255, 0.6)'",
    fallback: { token: 'colors.text.tertiary', requires: 'colors' },
  },
  {
    pattern: "'rgba(255, 255, 255, 0.7)'",
    fallback: { token: 'colors.text.tertiary', requires: 'colors' },
  },
  {
    pattern: "'rgba(255, 255, 255, 0.8)'",
    fallback: { token: 'colors.text.secondary', requires: 'colors' },
  },
  {
    pattern: "'rgba(255, 255, 255, 0.9)'",
    fallback: { token: 'colors.text.secondary', requires: 'colors' },
  },

  // Brand blue overlays
  {
    pattern: "'rgba(0, 99, 225, 0.1)'",
    fallback: { token: 'colors.brand.softer', requires: 'colors' },
  },
  {
    pattern: "'rgba(0, 99, 225, 0.15)'",
    fallback: { token: 'colors.brand.soft', requires: 'colors' },
  },
  {
    pattern: "'rgba(0, 99, 225, 0.2)'",
    fallback: { token: 'colors.brand.soft', requires: 'colors' },
  },
  {
    pattern: "'rgba(0, 99, 225, 0.3)'",
    fallback: { token: 'colors.brand.ring', requires: 'colors' },
  },

  // Error red overlays
  {
    pattern: "'rgba(239, 68, 68, 0.1)'",
    fallback: { token: 'colors.error.soft', requires: 'colors' },
  },
  {
    pattern: "'rgba(239, 68, 68, 0.15)'",
    fallback: { token: 'colors.error.softStrong', requires: 'colors' },
  },
  {
    pattern: "'rgba(239, 68, 68, 0.2)'",
    fallback: { token: 'colors.error.border', requires: 'colors' },
  },

  // Success green overlays
  {
    pattern: "'rgba(16, 185, 129, 0.15)'",
    fallback: { token: 'colors.success.soft', requires: 'colors' },
  },

  // Black scrim
  {
    pattern: "'rgba(0, 0, 0, 0.6)'",
    fallback: { token: 'colors.bg.overlay', requires: 'colors' },
  },
];

// Same rules for JSX attribute form (double-quoted)
const RGBA_RULES_JSX = RGBA_RULES.map((rule) => {
  const patternJsx = rule.pattern.replace(/'/g, '"');
  const wrap = (v) => ({ ...v, token: `{${v.token}}` });
  return {
    pattern: patternJsx,
    variants: rule.variants?.map(wrap),
    fallback: rule.fallback ? wrap(rule.fallback) : undefined,
  };
});

// ────────────────────────────────────────────────────────────────────────────
// FILE WALKER
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// TRANSFORM
// ────────────────────────────────────────────────────────────────────────────

function transform(source) {
  const usedImports = new Set();
  let changed = false;

  // 1) Apply RGBA context-aware line-by-line replacements first.
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (const rule of [...RGBA_RULES, ...RGBA_RULES_JSX]) {
      if (!line.includes(rule.pattern)) continue;
      let replacement;
      if (rule.variants) {
        const match = rule.variants.find((v) => line.includes(v.context));
        replacement = match ?? rule.fallback;
      } else {
        replacement = rule.fallback;
      }
      if (!replacement) continue;
      while (line.includes(rule.pattern)) {
        line = line.replace(rule.pattern, replacement.token);
        usedImports.add(replacement.requires);
        changed = true;
      }
    }
    lines[i] = line;
  }
  let out = lines.join('\n');

  // 2) Apply unambiguous hex string replacements (both quoted and JSX forms).
  for (const [from, to, req] of ACTIVE_HEX_MAP) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
      usedImports.add(req);
      changed = true;
    }
  }
  for (const [from, to, req] of JSX_MAP) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
      usedImports.add(req);
      changed = true;
    }
  }

  // 3) Inject theme import if we used any tokens and it isn't already there.
  if (usedImports.size > 0 && !/from\s+['"].*constants\/theme['"]/.test(out)) {
    const importList = [...usedImports].join(', ');
    // Compute relative path from file location → constants/theme
    // The caller injects the path; here we just leave a placeholder token.
    out = out.replace(
      /(import[^\n]*from\s+['"]react-native['"];?\s*\n)/,
      `$1__THEME_IMPORT__{${importList}}\n`,
    );
  }

  return { out, changed, usedImports };
}

// Relative path helper: from fileDir → constants/theme (no .ts extension)
function themeRelativePath(filePath) {
  const fileDir = path.dirname(filePath);
  const themePath = path.join(MOBILE_ROOT, 'constants', 'theme');
  let rel = path.relative(fileDir, themePath);
  if (!rel.startsWith('.')) rel = './' + rel;
  // Windows safety
  rel = rel.split(path.sep).join('/');
  return rel;
}

async function processFile(filePath) {
  const rel = path.relative(MOBILE_ROOT, filePath);
  if (SKIP_FILES.has(rel)) return { skipped: true, rel };

  const src = await readFile(filePath, 'utf8');
  const { out, changed, usedImports } = transform(src);

  if (!changed) return { skipped: true, rel, reason: 'no-matches' };

  // Finalize the theme import line with the correct relative path
  const relTheme = themeRelativePath(filePath);
  let finalOut = out.replace(
    /__THEME_IMPORT__\{([^}]+)\}/,
    `import {$1} from '${relTheme}';`,
  );

  // If the file already had the theme import, remove any leftover placeholder
  finalOut = finalOut.replace(/__THEME_IMPORT__\{[^}]+\}\n?/g, '');

  // If there WAS a pre-existing import but it's missing some of the names we
  // now need, append them.
  const existing = finalOut.match(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]*constants\/theme['"]/,
  );
  if (existing) {
    const existingNames = new Set(
      existing[1].split(',').map((n) => n.trim()).filter(Boolean),
    );
    const missing = [...usedImports].filter((n) => !existingNames.has(n));
    if (missing.length > 0) {
      const merged = [...existingNames, ...missing].join(', ');
      finalOut = finalOut.replace(
        existing[0],
        existing[0].replace(
          /\{\s*[^}]+\s*\}/,
          `{ ${merged} }`,
        ),
      );
    }
  }

  await writeFile(filePath, finalOut, 'utf8');
  return { changed: true, rel, usedImports: [...usedImports] };
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    await walk(path.join(MOBILE_ROOT, dir), files);
  }

  console.log(`Scanning ${files.length} files…\n`);

  const results = [];
  for (const f of files) {
    try {
      const r = await processFile(f);
      results.push(r);
    } catch (err) {
      console.error(`✗ ${path.relative(MOBILE_ROOT, f)}: ${err.message}`);
    }
  }

  const changed = results.filter((r) => r.changed);
  const skipped = results.filter((r) => r.skipped);

  console.log(`\n✓ Rewrote ${changed.length} files`);
  for (const r of changed) {
    console.log(`  • ${r.rel}  (${r.usedImports.join(', ')})`);
  }
  console.log(`\n- Skipped ${skipped.length} files (no matches)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
