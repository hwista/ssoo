#!/usr/bin/env node
/**
 * 타이포그래피 토큰 검증 스크립트
 *
 * @usage node .github/scripts/check-typography.js [files...]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TYPO_RULES = [
  {
    name: 'label-md',
    pattern: /\btext-sm\s+font-medium\b|\bfont-medium\s+text-sm\b/g,
    message: 'raw 조합 금지: text-label-md를 사용하세요',
  },
  {
    name: 'label-sm',
    pattern: /\btext-xs\s+font-medium\b|\bfont-medium\s+text-xs\b/g,
    message: 'raw 조합 금지: text-label-sm를 사용하세요',
  },
  {
    name: 'label-strong',
    pattern: /\btext-sm\s+font-semibold\b|\bfont-semibold\s+text-sm\b/g,
    message: 'raw 조합 금지: text-label-strong을 사용하세요',
  },
  {
    name: 'title-card',
    pattern: /\btext-lg\s+font-semibold\b|\bfont-semibold\s+text-lg\b/g,
    message: 'raw 조합 금지: text-title-card를 사용하세요',
  },
  {
    name: 'title-card-medium',
    pattern: /\btext-lg\s+font-medium\b|\bfont-medium\s+text-lg\b/g,
    message: 'raw 조합 금지: title 계층 semantic token을 사용하세요 (예: text-title-card)',
  },
  {
    name: 'body-text-medium',
    pattern: /\bbody-text\s+font-medium\b|\bfont-medium\s+body-text\b/g,
    message: 'raw 조합 금지: slot 역할에 맞는 semantic token을 사용하세요 (예: text-label-md)',
  },
  {
    name: 'standalone-xl-2xl',
    pattern: /\btext-(xl|2xl)\b/g,
    message: 'raw text-xl/text-2xl 금지: text-title-subsection 또는 text-title-section을 사용하세요',
    postCheck: (line) => !/\btext-title-(page|section|subsection|card)\b/.test(line),
  },
  {
    name: 'standalone-font-bold',
    pattern: /\bfont-bold\b/g,
    message: 'raw font-bold 금지: weight가 포함된 semantic token을 사용하세요 (예: text-title-section)',
  },
  {
    name: 'semantic-token-weight-override',
    pattern:
      /\btext-(title-card|title-section|title-subsection|title-page|label-md|label-sm|label-strong|badge|control-lg|body-md|body-sm|caption|code-inline|code-block|code-line-number)\s+font-(medium|semibold|bold)\b|\bfont-(medium|semibold|bold)\s+text-(title-card|title-section|title-subsection|title-page|label-md|label-sm|label-strong|badge|control-lg|body-md|body-sm|caption|code-inline|code-block|code-line-number)\b/g,
    message: 'semantic token에 raw weight override 금지: 토큰이 이미 weight를 정의합니다',
  },
  {
    name: 'font-family-hardcoded',
    pattern: /\bfontFamily\s*:\s*['"](?!var\(--font-)(?!inherit['"])[^'"]+['"]|font-family\s*:\s*(?!var\(--font-)(?!inherit\b)[^;]+/g,
    message: '폰트 하드코딩 금지: CSS 변수(--font-sans/--font-mono) 또는 inherit를 사용하세요',
  },
  {
    name: 'mono-raw-combo',
    pattern: /\bfont-mono\b(?=[^"'`\n]*\btext-(?:xs|sm|base|lg|xl|\[[^\]]+\])\b)|\bfont-mono\b(?=[^"'`\n]*\bfont-(?:medium|semibold|bold)\b)/g,
    message: 'font-mono raw 조합 금지: 코드 토큰을 사용하세요 (예: font-mono text-code-line-number)',
  },
  {
    name: 'badge-raw',
    pattern: /\btext-xs\s+font-semibold\b|\bfont-semibold\s+text-xs\b/g,
    message: 'raw 조합 금지: text-badge를 사용하세요',
  },
  {
    name: 'arbitrary-font-size',
    pattern: /\btext-\[(?:\d+(?:\.\d+)?)(?:px|rem)\]\b/g,
    message: 'arbitrary font-size 금지: 역할/밀도 기준 semantic token을 사용하세요',
  },
];

const TYPO_SEVERITY = {
  ui: 'error',
  common: 'error',
  layout: 'error',
  pages: 'error',
  templates: 'error',
};

function getScope(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized.includes('/src/components/ui/')) return 'ui';
  if (normalized.includes('/src/components/common/')) return 'common';
  if (normalized.includes('/src/components/layout/')) return 'layout';
  if (normalized.includes('/src/components/pages/')) return 'pages';
  if (normalized.includes('/src/components/templates/')) return 'templates';
  return null;
}

function isExcluded(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  return [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '.stories.',
    '/__tests__/',
    '.test.',
    '.spec.',
    '/demo/',
    '/tailwind.config.',
  ].some((pattern) => normalized.includes(pattern));
}

function shouldSkipLine(trimmed) {
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function allowTypographyException(line) {
  if (line.includes("fontFamily: 'inherit'") || line.includes('font-family: inherit')) {
    return true;
  }
  if (line.includes('typo-override:')) {
    return true;
  }
  return false;
}

function collectTsxFilesWithFallback() {
  const roots = [
    'apps/web/dms/src/components',
    'apps/web/pms/src/components',
    'apps/web/chs/src/components',
  ];

  try {
    const result = execFileSync(
      'rg',
      [
        '--files',
        '--glob',
        '*.tsx',
        ...roots,
      ],
      { encoding: 'utf8' }
    ).trim();
    return result ? result.split('\n') : [];
  } catch (error) {
    if (error.code !== 'EPERM') {
      throw error;
    }

    const files = [];
    const walk = (dir) => {
      if (!fs.existsSync(dir)) {
        return;
      }
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (entry.isFile() && fullPath.endsWith('.tsx')) {
          files.push(fullPath.split(path.sep).join('/'));
        }
      }
    };

    roots.forEach(walk);
    return files;
  }
}

function checkFile(filePath) {
  const scope = getScope(filePath);
  if (!scope || isExcluded(filePath) || !fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (shouldSkipLine(trimmed) || allowTypographyException(line)) {
      return;
    }

    const lineIssues = [];

    for (const rule of TYPO_RULES) {
      if (rule.pattern.test(line) && (!rule.postCheck || rule.postCheck(line))) {
        lineIssues.push({
          file: filePath,
          line: index + 1,
          severity: TYPO_SEVERITY[scope],
          message: rule.message,
          code: trimmed,
          ruleName: rule.name,
        });
      }
      rule.pattern.lastIndex = 0;
    }

    const hasWeightOverride = lineIssues.some((issue) => issue.ruleName === 'semantic-token-weight-override');
    const filteredIssues = hasWeightOverride
      ? lineIssues.filter((issue) => issue.ruleName !== 'standalone-font-bold')
      : lineIssues;

    filteredIssues.forEach(({ ruleName, ...issue }) => {
      issues.push(issue);
    });
  });

  return issues;
}

function main() {
  let files = process.argv.slice(2);
  if (files.length === 0) {
    files = collectTsxFilesWithFallback();
  }

  if (files.length === 0) {
    console.log('✅ 타이포그래피 검증 대상 없음');
    process.exit(0);
  }

  const issues = files.flatMap(checkFile);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  if (issues.length > 0) {
    console.log('\n📐 타이포그래피 검증 결과\n');
    if (errors.length > 0) {
      console.log('❌ 오류:\n');
      errors.forEach((issue) => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }

    if (warnings.length > 0) {
      console.log('⚠️ 경고:\n');
      warnings.forEach((issue) => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }
  }

  if (errors.length > 0) {
    console.log('❌ 타이포그래피 검증 실패\n');
    process.exit(1);
  }

  console.log('✅ 타이포그래피 검증 통과\n');
}

main();
