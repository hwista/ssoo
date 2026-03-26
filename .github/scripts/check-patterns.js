#!/usr/bin/env node
/**
 * 코드 패턴 검증 스크립트
 * 
 * pre-commit hook에서 실행되어 다음을 검증:
 * 1. 와일드카드 export 금지
 * 2. any 타입 사용 금지 (타입 정의 제외)
 * 3. console.log 잔류 금지 (개발용)
 * 4. 디렉토리명 prefix 사용 금지 (DMS)
 * 
 * @usage node .github/scripts/check-patterns.js [files...]
 */

const fs = require('fs');
const path = require('path');

const RULES = [
  {
    name: 'wildcard-export',
    pattern: /export\s+\*\s+from/g,
    message: '와일드카드 export 금지: 명시적 re-export를 사용하세요',
    severity: 'error',
    exclude: ['node_modules', 'dist', '.next'],
    filePattern: /\.(ts|tsx|js|jsx)$/,
  },
  {
    name: 'any-type',
    pattern: /:\s*any\b(?!\s*\))/g, // `: any` but not in comments
    message: 'any 타입 금지: unknown 또는 구체적 타입을 사용하세요',
    severity: 'warning',
    exclude: ['node_modules', 'dist', '.next', '*.d.ts', 'types/'],
    filePattern: /\.(ts|tsx)$/,
  },
  {
    name: 'console-log',
    pattern: /console\.(log|debug|info)\(/g,
    message: 'console.log 잔류: 커밋 전 제거 또는 logger 사용',
    severity: 'warning',
    exclude: ['node_modules', 'dist', '.next', 'scripts/', '.github/scripts/', '*.config.*'],
    filePattern: /\.(ts|tsx|js|jsx)$/,
  },
];

// 디렉토리 prefix 검증 규칙 (파일명 기반)
const NAMING_RULES = [
  {
    name: 'directory-prefix',
    message: '파일명에 디렉토리명 prefix 사용 금지: 예) editor/EditorToolbar.tsx → editor/Toolbar.tsx',
    severity: 'error',
    // 전역: DMS + PMS 컴포넌트 디렉토리
    pathPattern: /apps\/web\/(dms|pms)\/src\/components\//,
    exclude: ['node_modules', 'dist', '.next', 'index.ts', 'index.tsx'],
    filePattern: /\.(tsx)$/,
    check: (filePath) => {
      const parts = filePath.split(path.sep);
      const fileName = parts[parts.length - 1];
      const dirName = parts[parts.length - 2];
      const normalizedPath = filePath.split(path.sep).join('/');

      // page entry는 {Feature}Page.tsx 정본을 허용
      if (/apps\/web\/(dms|pms)\/src\/components\/pages\/[^/]+\/[A-Z][A-Za-z0-9]*Page\.tsx$/.test(normalizedPath)) {
        return null;
      }
      
      // index 파일은 무시
      if (fileName === 'index.ts' || fileName === 'index.tsx') {
        return null;
      }
      
      // 디렉토리명의 첫 글자를 대문자로
      const dirPrefix = dirName.charAt(0).toUpperCase() + dirName.slice(1);
      const fileBaseName = fileName.replace(/\.(tsx?)$/, '');
      
      // 파일명이 디렉토리명으로 시작하고, 디렉토리명 자체가 아닌 경우
      // 예: editor/EditorToolbar.tsx (위반), editor/Editor.tsx (허용)
      if (fileBaseName.startsWith(dirPrefix) && fileBaseName !== dirPrefix) {
        return {
          file: filePath,
          line: 0,
          rule: 'directory-prefix',
          severity: 'error',
          message: `파일명 '${fileName}'이 디렉토리명 '${dirName}' prefix를 사용함. '${fileBaseName.replace(dirPrefix, '')}.tsx'로 변경 권장`,
          code: filePath,
        };
      }
      return null;
    },
  },
];

function shouldExclude(filePath, excludePatterns) {
  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

function checkFile(filePath, rules) {
  const issues = [];
  
  if (!fs.existsSync(filePath)) {
    return issues;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const rule of rules) {
    // 파일 패턴 확인
    if (!rule.filePattern.test(filePath)) {
      continue;
    }

    // 제외 패턴 확인
    if (shouldExclude(filePath, rule.exclude)) {
      continue;
    }

    // 라인별 검사
    lines.forEach((line, index) => {
      // 주석 무시
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }

      const matches = line.match(rule.pattern);
      if (matches) {
        issues.push({
          file: filePath,
          line: index + 1,
          rule: rule.name,
          severity: rule.severity,
          message: rule.message,
          code: line.trim(),
        });
      }
    });
  }

  return issues;
}

function main() {
  const args = process.argv.slice(2);
  
  // 인자가 없으면 staged 파일 없음으로 처리
  if (args.length === 0) {
    console.log('✅ 검증할 파일 없음');
    process.exit(0);
  }

  const allIssues = [];

  for (const filePath of args) {
    // 코드 패턴 검사
    const issues = checkFile(filePath, RULES);
    allIssues.push(...issues);
    
    // 파일 명명 규칙 검사
    for (const rule of NAMING_RULES) {
      // 경로 패턴 확인
      if (rule.pathPattern && !rule.pathPattern.test(filePath)) {
        continue;
      }
      // 파일 패턴 확인
      if (rule.filePattern && !rule.filePattern.test(filePath)) {
        continue;
      }
      // 제외 패턴 확인
      if (rule.exclude && shouldExclude(filePath, rule.exclude)) {
        continue;
      }
      
      const issue = rule.check(filePath);
      if (issue) {
        allIssues.push(issue);
      }
    }
  }

  // 결과 출력
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  if (allIssues.length > 0) {
    console.log('\n📋 패턴 검증 결과\n');

    if (errors.length > 0) {
      console.log('❌ 오류 (커밋 차단):\n');
      errors.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }

    if (warnings.length > 0) {
      console.log('⚠️ 경고:\n');
      warnings.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }

    console.log(`\n총: ${errors.length} 오류, ${warnings.length} 경고\n`);
  }

  // 오류가 있으면 exit 1
  if (errors.length > 0) {
    console.log('❌ 패턴 검증 실패: 오류를 수정 후 다시 시도하세요\n');
    process.exit(1);
  }

  console.log('✅ 패턴 검증 통과\n');
  process.exit(0);
}

main();
