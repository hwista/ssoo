#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const manifestPath = path.join(ROOT, '.codex/config/sync-manifest.json');
const mapPath = path.join(ROOT, '.codex/config/reference-map.json');

const red = '\x1b[31m';
const yellow = '\x1b[33m';
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing file: ${path.relative(ROOT, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function containsPattern(filePath, pattern) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: `missing file: ${path.relative(ROOT, filePath)}` };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(pattern)) {
    return {
      ok: false,
      reason: `pattern not found: "${pattern}" in ${path.relative(ROOT, filePath)}`,
    };
  }
  return { ok: true };
}

function verifyReferenceMap(referenceMap) {
  const results = [];

  const entry = path.join(ROOT, referenceMap.entrypoint);
  if (!fs.existsSync(entry)) {
    results.push({ severity: 'error', message: `entrypoint missing: ${referenceMap.entrypoint}` });
  }

  for (const mapping of referenceMap.path_mappings || []) {
    const target = path.join(ROOT, mapping.instruction);
    if (!fs.existsSync(target)) {
      results.push({ severity: 'error', message: `mapping target missing: ${mapping.instruction}` });
    }
  }

  for (const [group, paths] of Object.entries(referenceMap.canonical_docs || {})) {
    for (const rel of paths) {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) {
        results.push({ severity: 'error', message: `canonical_docs.${group} missing: ${rel}` });
      }
    }
  }

  return results;
}

function main() {
  console.log(`${cyan}[codex-sync] verify start${reset}`);

  let errors = 0;
  let warnings = 0;

  let manifest;
  let referenceMap;

  try {
    manifest = readJson(manifestPath);
    referenceMap = readJson(mapPath);
  } catch (err) {
    console.error(`${red}[codex-sync] ${err.message}${reset}`);
    process.exit(1);
  }

  const mapResults = verifyReferenceMap(referenceMap);
  for (const r of mapResults) {
    if (r.severity === 'error') {
      errors += 1;
      console.error(`${red}✗ ${r.message}${reset}`);
    } else {
      warnings += 1;
      console.warn(`${yellow}⚠ ${r.message}${reset}`);
    }
  }

  for (const check of manifest.checks || []) {
    const sourcePath = path.join(ROOT, check.source);
    const targetPath = path.join(ROOT, check.target);

    const sourceResult = containsPattern(sourcePath, check.sourcePattern);
    const targetResult = containsPattern(targetPath, check.targetPattern);

    if (!sourceResult.ok) {
      const msg = `[${check.id}] source ${sourceResult.reason}`;
      if (check.severity === 'error') {
        errors += 1;
        console.error(`${red}✗ ${msg}${reset}`);
      } else {
        warnings += 1;
        console.warn(`${yellow}⚠ ${msg}${reset}`);
      }
      continue;
    }

    if (!targetResult.ok) {
      const msg = `[${check.id}] target ${targetResult.reason}`;
      if (check.severity === 'error') {
        errors += 1;
        console.error(`${red}✗ ${msg}${reset}`);
      } else {
        warnings += 1;
        console.warn(`${yellow}⚠ ${msg}${reset}`);
      }
      continue;
    }

    console.log(`${green}✓ [${check.id}] synced markers found${reset}`);
  }

  if (errors > 0) {
    console.error(`${red}[codex-sync] failed: ${errors} error(s), ${warnings} warning(s)${reset}`);
    process.exit(1);
  }

  if (warnings > 0) {
    console.warn(`${yellow}[codex-sync] passed with warnings: ${warnings}${reset}`);
  } else {
    console.log(`${green}[codex-sync] passed${reset}`);
  }
}

main();
