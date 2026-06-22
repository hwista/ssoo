#!/usr/bin/env node
/**
 * SSOO platform UI primitive inventory gate.
 *
 * Enforces:
 * - every app-local components/ui primitive file is declared in the inventory
 * - every declared primitive is a platform primitive implemented only in @ssoo/web-ui
 * - app-local files are thin @ssoo/web-ui re-export adapters
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT_DIR = path.resolve(__dirname, '../..');
const INVENTORY_PATH = path.join(ROOT_DIR, 'packages/web-ui/primitive-inventory.json');
const WEB_UI_SRC_DIR = path.join(ROOT_DIR, 'packages/web-ui/src');
const APP_WEB_DIR = path.join(ROOT_DIR, 'apps/web');
const STORY_FILE_PATTERN = /\.stories\.(ts|tsx)$/;
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const PLATFORM_ADAPTER_FORBIDDEN_PATTERNS = [
  { pattern: /\bReact\.forwardRef\b|\bforwardRef\s*</, reason: 'forwardRef implementation belongs in @ssoo/web-ui' },
  { pattern: /\bcva\s*\(/, reason: 'variant recipe belongs in @ssoo/web-ui' },
  { pattern: /\bclassName\s*=/, reason: 'class recipe belongs in @ssoo/web-ui' },
  { pattern: /\bcn\s*\(/, reason: 'class merging belongs in @ssoo/web-ui implementation' },
  { pattern: /from\s+['"]class-variance-authority['"]/, reason: 'variant dependency belongs in @ssoo/web-ui' },
  { pattern: /from\s+['"]@radix-ui\//, reason: 'Radix wrapper belongs in @ssoo/web-ui after platform promotion' },
  { pattern: /<\s*(button|input|textarea|select|table|thead|tbody|tr|th|td|div|span)\b/, reason: 'JSX markup belongs in @ssoo/web-ui implementation' },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toRepoPath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function getPrimitiveName(filePath) {
  return path.basename(filePath).replace(/\.(ts|tsx)$/, '');
}

function isIgnoredUiFile(filePath) {
  const baseName = path.basename(filePath);
  return (
    !SOURCE_FILE_PATTERN.test(filePath)
    || STORY_FILE_PATTERN.test(filePath)
    || baseName === 'index.ts'
    || baseName === 'index.tsx'
  );
}

function validateInventory(inventory, issues) {
  if (inventory.schemaVersion !== 1) {
    issues.push({
      severity: 'error',
      file: toRepoPath(INVENTORY_PATH),
      message: `unsupported schemaVersion: ${inventory.schemaVersion}`,
    });
  }
  if (!inventory.primitives || typeof inventory.primitives !== 'object') {
    issues.push({
      severity: 'error',
      file: toRepoPath(INVENTORY_PATH),
      message: 'missing primitives object',
    });
  }
  for (const [primitiveName, primitive] of Object.entries(inventory.primitives || {})) {
    if (primitive.status !== 'platform') {
      issues.push({
        severity: 'error',
        file: toRepoPath(INVENTORY_PATH),
        message: `primitive '${primitiveName}' must be status "platform"; intermediate/local-only primitive states are not allowed`,
      });
    }
  }
}

function validatePlatformSource(inventory, issues) {
  const indexPath = path.join(WEB_UI_SRC_DIR, 'index.ts');
  const exportsBySource = collectNamedExportsBySource(indexPath);
  const sourceFiles = listFilesRecursive(WEB_UI_SRC_DIR)
    .filter((filePath) => SOURCE_FILE_PATTERN.test(filePath))
    .filter((filePath) => !['index.ts', 'cn.ts'].includes(path.basename(filePath)));

  for (const filePath of sourceFiles) {
    const primitiveName = getPrimitiveName(filePath);
    const primitive = inventory.primitives[primitiveName];
    if (!primitive) {
      issues.push({
        severity: 'error',
        file: toRepoPath(filePath),
        message: `@ssoo/web-ui source primitive '${primitiveName}' is not declared in primitive-inventory.json`,
      });
      continue;
    }
    if (primitive.status !== 'platform') {
      issues.push({
        severity: 'error',
        file: toRepoPath(filePath),
        message: `@ssoo/web-ui source primitive '${primitiveName}' must have status "platform" in inventory`,
      });
    }
  }

  for (const [primitiveName, primitive] of Object.entries(inventory.primitives)) {
    if (!primitive.source) {
      issues.push({
        severity: 'error',
        file: toRepoPath(INVENTORY_PATH),
        message: `platform primitive '${primitiveName}' is missing source`,
      });
      continue;
    }
    const sourcePath = path.join(ROOT_DIR, primitive.source);
    if (!fs.existsSync(sourcePath)) {
      issues.push({
        severity: 'error',
        file: primitive.source,
        message: `platform primitive '${primitiveName}' source file does not exist`,
      });
    }
    const sourceStem = path.basename(primitive.source).replace(/\.(ts|tsx)$/, '');
    const exportedNames = exportsBySource.get(sourceStem) ?? new Set();
    if (exportedNames.size === 0) {
      issues.push({
        severity: 'error',
        file: toRepoPath(indexPath),
        message: `platform primitive '${primitiveName}' is not exported from @ssoo/web-ui index`,
      });
      continue;
    }
    for (const exportName of primitive.exports ?? []) {
      if (!exportedNames.has(exportName)) {
        issues.push({
          severity: 'error',
          file: toRepoPath(indexPath),
          message: `platform primitive '${primitiveName}' export '${exportName}' is declared in inventory but not exported from @ssoo/web-ui index`,
        });
      }
    }
  }
}

function getModuleStem(moduleSpecifier) {
  return path.basename(moduleSpecifier).replace(/\.(ts|tsx)$/, '').replace(/^\.\//, '');
}

function collectNamedExportsBySource(filePath) {
  const exportsBySource = new Map();
  if (!fs.existsSync(filePath)) {
    return exportsBySource;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement)
      || !statement.moduleSpecifier
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || !statement.exportClause
      || !ts.isNamedExports(statement.exportClause)
    ) {
      continue;
    }

    const sourceStem = getModuleStem(statement.moduleSpecifier.text);
    const exportedNames = exportsBySource.get(sourceStem) ?? new Set();
    for (const element of statement.exportClause.elements) {
      exportedNames.add(element.name.text);
    }
    exportsBySource.set(sourceStem, exportedNames);
  }

  return exportsBySource;
}

function collectNamedReExportsFromWebUi(filePath, issues) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exportedNames = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue;
    }
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
      issues.push({
        severity: 'error',
        file: toRepoPath(filePath),
        message: 'app adapter must only use named re-exports from @ssoo/web-ui',
      });
      continue;
    }
    if (statement.moduleSpecifier.text !== '@ssoo/web-ui') {
      issues.push({
        severity: 'error',
        file: toRepoPath(filePath),
        message: `app adapter re-export source must be @ssoo/web-ui, got '${statement.moduleSpecifier.text}'`,
      });
      continue;
    }
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      issues.push({
        severity: 'error',
        file: toRepoPath(filePath),
        message: 'app adapter must not use wildcard exports',
      });
      continue;
    }
    for (const element of statement.exportClause.elements) {
      exportedNames.add(element.name.text);
    }
  }

  return exportedNames;
}

function getAllowedAdapterExports(inventory, primitiveName) {
  const primitive = inventory.primitives[primitiveName];
  if (!primitive) {
    return new Set();
  }
  const sameSourcePrimitives = Object.values(inventory.primitives)
    .filter((candidate) => candidate.source === primitive.source);
  return new Set(sameSourcePrimitives.flatMap((candidate) => candidate.exports ?? []));
}

function validatePlatformAdapter(filePath, primitiveName, inventory, issues) {
  const content = fs.readFileSync(filePath, 'utf8');
  const repoPath = toRepoPath(filePath);
  const adapterExportIssues = [];
  const exportedNames = collectNamedReExportsFromWebUi(filePath, adapterExportIssues);
  issues.push(...adapterExportIssues);
  if (!/from\s+['"]@ssoo\/web-ui['"]/.test(content)) {
    issues.push({
      severity: 'error',
      file: repoPath,
      message: `platform primitive '${primitiveName}' app adapter must re-export from @ssoo/web-ui`,
    });
  }
  if (/^\s*import\s/m.test(content)) {
    issues.push({
      severity: 'error',
      file: repoPath,
      message: `platform primitive '${primitiveName}' app adapter must not import local implementation dependencies`,
    });
  }
  const allowedExports = getAllowedAdapterExports(inventory, primitiveName);
  for (const exportName of exportedNames) {
    if (!allowedExports.has(exportName)) {
      issues.push({
        severity: 'error',
        file: repoPath,
        message: `platform primitive '${primitiveName}' app adapter re-exports '${exportName}', which is not declared in the inventory source export set`,
      });
    }
  }
  for (const rule of PLATFORM_ADAPTER_FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(content)) {
      issues.push({
        severity: 'error',
        file: repoPath,
        message: `platform primitive '${primitiveName}' app adapter is not a thin re-export: ${rule.reason}`,
      });
    }
  }
}

function validateAppUiInventory(inventory, issues) {
  if (!fs.existsSync(APP_WEB_DIR)) {
    return;
  }
  const appDirs = fs.readdirSync(APP_WEB_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(APP_WEB_DIR, entry.name));

  for (const appDir of appDirs) {
    const uiDir = path.join(appDir, 'src/components/ui');
    for (const filePath of listFilesRecursive(uiDir)) {
      if (isIgnoredUiFile(filePath)) {
        continue;
      }
      const primitiveName = getPrimitiveName(filePath);
      const primitive = inventory.primitives[primitiveName];
      if (!primitive) {
        issues.push({
          severity: 'error',
          file: toRepoPath(filePath),
          message: `app-local UI primitive '${primitiveName}' is not declared in primitive-inventory.json`,
        });
        continue;
      }
      validatePlatformAdapter(filePath, primitiveName, inventory, issues);
    }
  }
}

function printIssues(issues) {
  if (issues.length === 0) {
    console.log('✅ UI primitive inventory 검증 통과');
    return;
  }

  console.log('\n🧱 UI primitive inventory 검증 결과\n');
  for (const issue of issues) {
    console.log(`  ${issue.file}`);
    console.log(`    ${issue.message}\n`);
  }
  console.log(`총: ${issues.length} 오류\n`);
}

function main() {
  const issues = [];
  if (!fs.existsSync(INVENTORY_PATH)) {
    issues.push({
      severity: 'error',
      file: toRepoPath(INVENTORY_PATH),
      message: 'primitive inventory file is missing',
    });
    printIssues(issues);
    process.exit(1);
  }

  const inventory = readJson(INVENTORY_PATH);
  validateInventory(inventory, issues);
  if (issues.length === 0) {
    validatePlatformSource(inventory, issues);
    validateAppUiInventory(inventory, issues);
  }
  printIssues(issues);
  process.exit(issues.length > 0 ? 1 : 0);
}

main();
