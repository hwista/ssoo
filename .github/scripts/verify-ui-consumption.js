#!/usr/bin/env node
/**
 * SSOO platform UI primitive consumption gate.
 *
 * Enforces that app and shared web surfaces consume @ssoo/web-ui primitives
 * instead of rendering raw JSX intrinsic controls/tables directly.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT_DIR = path.resolve(__dirname, '../..');
const INVENTORY_PATH = path.join(ROOT_DIR, 'packages/web-ui/primitive-inventory.json');
const SCAN_ROOTS = [
  'apps/web',
  'packages/web-auth/src',
  'packages/web-shell/src',
];
const SOURCE_FILE_PATTERN = /\.(tsx)$/;
const STORY_FILE_PATTERN = /\.stories\.(ts|tsx)$/;
const IGNORED_DIRS = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
  'storybook-static',
]);
const RAW_PRIMITIVE_TAGS = new Set([
  'button',
  'input',
  'textarea',
  'select',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
]);
const STATIC_INTERACTIVE_TAGS = new Set([
  'div',
  'span',
  'li',
  'p',
  'section',
  'article',
]);
const INTERACTIVE_ROLE_VALUES = new Set([
  'button',
  'checkbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
]);
const RECIPE_CLASS_COMPONENTS = new Set([
  'Button',
  'Checkbox',
  'Input',
  'NativeSelect',
  'SelectTrigger',
  'Textarea',
]);
const RECIPE_SIGNATURES = {
  Button: {
    threshold: 8,
    tokens: new Set([
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'whitespace-nowrap',
      'rounded-md',
      'text-label-md',
      'transition-colors',
      'focus-visible:outline-none',
      'focus-visible:ring-1',
      'focus-visible:ring-ring',
      'disabled:pointer-events-none',
      'disabled:opacity-50',
      'bg-ssoo-primary',
      'text-white',
      'shadow',
      'hover:bg-ssoo-primary-hover',
      'border',
      'border-ssoo-content-border',
      'bg-white',
      'text-ssoo-primary',
      'shadow-sm',
      'hover:bg-ssoo-sitemap-bg',
      'h-control-h',
      'w-control-h',
      'px-4',
      'py-2',
      'px-3',
      'text-caption',
    ]),
  },
  Checkbox: {
    threshold: 5,
    tokens: new Set(['h-4', 'w-4', 'rounded-sm', 'border', 'border-primary', 'focus-visible:ring-1', 'disabled:opacity-50']),
  },
  Input: {
    threshold: 7,
    tokens: new Set([
      'flex',
      'h-control-h',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-1',
      'text-body-sm',
      'shadow-sm',
      'transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none',
      'focus-visible:ring-1',
      'focus-visible:ring-ring',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    ]),
  },
  NativeSelect: {
    threshold: 7,
    tokens: new Set([
      'flex',
      'h-control-h',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-1',
      'text-body-sm',
      'shadow-sm',
      'transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none',
      'focus-visible:ring-1',
      'focus-visible:ring-ring',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    ]),
  },
  SelectTrigger: {
    threshold: 7,
    tokens: new Set([
      'flex',
      'h-control-h',
      'w-full',
      'items-center',
      'justify-between',
      'whitespace-nowrap',
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-2',
      'text-body-sm',
      'shadow-sm',
      'ring-offset-background',
      'focus:outline-none',
      'focus:ring-1',
      'focus:ring-ring',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    ]),
  },
  Textarea: {
    threshold: 7,
    tokens: new Set([
      'flex',
      'min-h-[60px]',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-2',
      'text-base',
      'shadow-sm',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none',
      'focus-visible:ring-1',
      'focus-visible:ring-ring',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      'md:text-sm',
    ]),
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const INVENTORY_EXPORTS = new Set(
  Object.values(readJson(INVENTORY_PATH).primitives)
    .flatMap((primitive) => primitive.exports ?? []),
);

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
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else if (SOURCE_FILE_PATTERN.test(entryPath) && !STORY_FILE_PATTERN.test(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function getJsxTagIdentifier(tagName) {
  return ts.isIdentifier(tagName) ? tagName.text : null;
}

function isIntrinsicTag(tagName) {
  return /^[a-z]/.test(tagName);
}

function getJsxAttribute(attributes, name) {
  return attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.text === name,
  ) ?? null;
}

function hasJsxAttribute(attributes, name) {
  return Boolean(getJsxAttribute(attributes, name));
}

function getStringLiteralAttributeValue(attribute) {
  if (!attribute || !attribute.initializer) {
    return null;
  }
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }
  if (
    ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression
    && ts.isStringLiteralLike(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return null;
}

function collectRawPrimitiveTagValues(expression, rawTagNames) {
  if (ts.isStringLiteral(expression) && RAW_PRIMITIVE_TAGS.has(expression.text)) {
    rawTagNames.add(expression.text);
    return true;
  }

  if (ts.isNoSubstitutionTemplateLiteral(expression) && RAW_PRIMITIVE_TAGS.has(expression.text)) {
    rawTagNames.add(expression.text);
    return true;
  }

  if (ts.isConditionalExpression(expression)) {
    const whenTrue = collectRawPrimitiveTagValues(expression.whenTrue, rawTagNames);
    const whenFalse = collectRawPrimitiveTagValues(expression.whenFalse, rawTagNames);
    return whenTrue || whenFalse;
  }

  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return collectRawPrimitiveTagValues(expression.expression, rawTagNames);
  }

  return false;
}

function collectRawPrimitiveAliases(sourceFile) {
  const aliases = new Map();

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const rawTagNames = new Set();
      if (collectRawPrimitiveTagValues(node.initializer, rawTagNames)) {
        aliases.set(node.name.text, [...rawTagNames]);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return aliases;
}

function collectStringConstants(sourceFile) {
  const constants = new Map();

  function readStaticString(expression) {
    if (ts.isStringLiteralLike(expression)) {
      return expression.text;
    }
    if (ts.isNoSubstitutionTemplateLiteral(expression)) {
      return expression.text;
    }
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
      return readStaticString(expression.expression);
    }
    return null;
  }

  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
    ) {
      const staticString = readStaticString(node.initializer);
      if (staticString !== null) {
        constants.set(node.name.text, staticString);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return constants;
}

function collectUiPrimitiveIdentifiers(sourceFile) {
  const primitiveIdentifiers = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const source = statement.moduleSpecifier.text;
    const isUiImport = source === '@ssoo/web-ui' || /(?:^|\/)components\/ui\//.test(source);
    if (!isUiImport || !statement.importClause) {
      continue;
    }

    const namedBindings = statement.importClause.namedBindings;
    if (statement.importClause.name && INVENTORY_EXPORTS.has(statement.importClause.name.text)) {
      primitiveIdentifiers.add(statement.importClause.name.text);
    }
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (INVENTORY_EXPORTS.has(importedName)) {
          primitiveIdentifiers.add(element.name.text);
        }
      }
    }
  }

  return primitiveIdentifiers;
}

function collectStaticClassText(expression, constants, output = []) {
  if (!expression) {
    return output;
  }
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    output.push(expression.text);
    return output;
  }
  if (ts.isIdentifier(expression) && constants.has(expression.text)) {
    output.push(constants.get(expression.text));
    return output;
  }
  if (
    ts.isParenthesizedExpression(expression)
    || ts.isAsExpression(expression)
    || ts.isSatisfiesExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return collectStaticClassText(expression.expression, constants, output);
  }
  if (ts.isJsxExpression(expression) && expression.expression) {
    return collectStaticClassText(expression.expression, constants, output);
  }
  if (ts.isConditionalExpression(expression)) {
    collectStaticClassText(expression.whenTrue, constants, output);
    collectStaticClassText(expression.whenFalse, constants, output);
    return output;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    for (const element of expression.elements) {
      collectStaticClassText(element, constants, output);
    }
    return output;
  }
  if (ts.isCallExpression(expression)) {
    for (const argument of expression.arguments) {
      collectStaticClassText(argument, constants, output);
    }
    return output;
  }
  return output;
}

function getRecipeSignatureHits(componentName, classText) {
  const signature = RECIPE_SIGNATURES[componentName];
  if (!signature) {
    return [];
  }
  const tokens = new Set(classText.split(/\s+/).filter(Boolean));
  const hits = [];
  for (const token of signature.tokens) {
    if (tokens.has(token)) {
      hits.push(token);
    }
  }
  return hits;
}

function hasRecipeClassOverride(componentName, classText) {
  const signature = RECIPE_SIGNATURES[componentName];
  if (!signature) {
    return false;
  }
  return getRecipeSignatureHits(componentName, classText).length >= signature.threshold;
}

function getRecipeClassIssueDetail(componentName, classText) {
  const hits = getRecipeSignatureHits(componentName, classText);
  return hits.slice(0, 8);
}

function getRecipeClassCategories(classText) {
  const categories = new Set();
  for (const token of classText.split(/\s+/).filter(Boolean)) {
    if (/^(h-|min-h-|max-h-)/.test(token)) {
      categories.add('height');
    } else if (/^rounded(?:-|$)/.test(token)) {
      categories.add('radius');
    } else if (/^(border|border-)/.test(token)) {
      categories.add('border');
    } else if (/^(bg-|hover:bg-|active:bg-|focus:bg-)/.test(token)) {
      categories.add('background');
    } else if (/^(px-|py-)/.test(token)) {
      categories.add('spacing');
    } else if (/^shadow(?:-|$)/.test(token)) {
      categories.add('shadow');
    } else if (/^(outline|outline-|ring|ring-|focus:|focus-visible:|ring-offset-)/.test(token)) {
      categories.add('focus');
    } else if (/^disabled:/.test(token)) {
      categories.add('disabled');
    } else if (/^(font-|text-(body|label|control|caption|base|sm|xs|lg|xl|\[))/.test(token)) {
      categories.add('typography');
    }
  }
  return categories;
}

function getClassNameText(attributes, constants) {
  const classNameAttribute = getJsxAttribute(attributes, 'className');
  if (!classNameAttribute || !classNameAttribute.initializer) {
    return '';
  }
  if (ts.isStringLiteral(classNameAttribute.initializer)) {
    return classNameAttribute.initializer.text;
  }
  return collectStaticClassText(classNameAttribute.initializer, constants).join(' ');
}

function collectIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rawPrimitiveAliases = collectRawPrimitiveAliases(sourceFile);
  const stringConstants = collectStringConstants(sourceFile);
  const uiPrimitiveIdentifiers = collectUiPrimitiveIdentifiers(sourceFile);
  const issues = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = getJsxTagIdentifier(node.tagName);
      const attributes = node.attributes;
      if (tagName && RAW_PRIMITIVE_TAGS.has(tagName)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        issues.push({
          file: toRepoPath(filePath),
          line: position.line + 1,
          kind: 'raw-tag',
          tagName,
          aliasName: null,
        });
      } else if (tagName && rawPrimitiveAliases.has(tagName)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        issues.push({
          file: toRepoPath(filePath),
          line: position.line + 1,
          kind: 'raw-tag',
          tagName: rawPrimitiveAliases.get(tagName).join('|'),
          aliasName: tagName,
        });
      }
      if (tagName && isIntrinsicTag(tagName)) {
        const roleValue = getStringLiteralAttributeValue(getJsxAttribute(attributes, 'role'));
        const hasInteractiveRole = roleValue && INTERACTIVE_ROLE_VALUES.has(roleValue);
        const hasPseudoControlHandlers = (
          hasJsxAttribute(attributes, 'onClick')
          && (
            hasJsxAttribute(attributes, 'tabIndex')
            || hasJsxAttribute(attributes, 'onKeyDown')
            || hasInteractiveRole
          )
        );
        if (
          (STATIC_INTERACTIVE_TAGS.has(tagName) && (hasInteractiveRole || hasPseudoControlHandlers))
          || (tagName === 'a' && hasInteractiveRole)
        ) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          issues.push({
            file: toRepoPath(filePath),
            line: position.line + 1,
            kind: 'pseudo-control',
            tagName,
            roleName: roleValue,
          });
        }
      }
      if (
        tagName
        && uiPrimitiveIdentifiers.has(tagName)
        && RECIPE_CLASS_COMPONENTS.has(tagName)
      ) {
        const classText = getClassNameText(attributes, stringConstants);
        const categories = getRecipeClassCategories(classText);
        if (hasRecipeClassOverride(tagName, classText)) {
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          issues.push({
            file: toRepoPath(filePath),
            line: position.line + 1,
            kind: 'recipe-class',
            tagName,
            categories: [...categories].sort(),
            recipeTokens: getRecipeClassIssueDetail(tagName, classText),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

function printIssues(issues) {
  if (issues.length === 0) {
    console.log('✅ UI primitive consumption 검증 통과');
    return;
  }

  console.log('\n🧱 UI primitive consumption 검증 결과\n');
  for (const issue of issues) {
    console.log(`  ${issue.file}:${issue.line}`);
    if (issue.kind === 'recipe-class') {
      console.log(`    <${issue.tagName}> className duplicates @ssoo/web-ui recipe tokens (${issue.recipeTokens.join(', ')}); move recipe to @ssoo/web-ui variant/size or keep className layout-only\n`);
    } else if (issue.kind === 'pseudo-control') {
      const roleSuffix = issue.roleName ? ` role="${issue.roleName}"` : '';
      console.log(`    intrinsic <${issue.tagName}>${roleSuffix} acts as an interactive primitive; use @ssoo/web-ui Button/Checkbox/Select/etc. instead\n`);
    } else {
      const renderedTag = issue.aliasName ? `<${issue.aliasName}> -> <${issue.tagName}>` : `<${issue.tagName}>`;
      console.log(`    raw ${renderedTag} is not allowed here; use @ssoo/web-ui platform primitive inventory\n`);
    }
  }
  console.log(`총: ${issues.length} 오류\n`);
}

function main() {
  const files = SCAN_ROOTS.flatMap((scanRoot) => listFilesRecursive(path.join(ROOT_DIR, scanRoot)));
  const issues = files.flatMap(collectIssues);
  printIssues(issues);
  process.exit(issues.length > 0 ? 1 : 0);
}

main();
