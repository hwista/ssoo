#!/usr/bin/env node
/**
 * 디자인 패턴 검증 스크립트
 * 
 * DMS 컴포넌트의 디자인 규칙 준수 여부를 검증:
 * 1. 컨트롤 높이가 컨테이너에 잘못 적용된 경우 감지
 *    - AI가 컨트롤 생성 요청 시 요청하지 않은 컨테이너를 추가하면 위반
 *    - 예외 승인 없이 컨테이너 사용 시 경고
 * 2. 허용된 컨테이너 패턴 외 사용 시 경고
 * 
 * @usage node .github/scripts/check-design.js [files...]
 */

const fs = require('fs');
const path = require('path');

// 디자인 규칙 정의
const DESIGN_RULES = [
  {
    name: 'control-height-on-container',
    description: '컨트롤 높이 클래스가 컨테이너에 적용됨',
    severity: 'warning',
    // 전역: DMS + PMS 컴포넌트
    pathPattern: /apps\/web\/(dms|pms)\/src\/components\//,
    filePattern: /\.(tsx)$/,
    exclude: ['node_modules', 'dist', '.next'],
    check: (content, filePath) => {
      const issues = [];
      const lines = content.split('\n');
      
      // h-control-h, h-control-h-sm, h-control-h-lg가 div, wrapper 등에 사용된 경우 감지
      // 허용: Button, Input, 실제 컨트롤 컴포넌트
      const containerPatterns = [
        // div에 컨트롤 높이 적용
        /<div[^>]*className=[^>]*h-control-h(?:-sm|-lg)?[^>]*>/g,
        // wrapper, container에 컨트롤 높이 적용
        /className=[^>]*(?:wrapper|container|group)[^>]*h-control-h(?:-sm|-lg)?/gi,
      ];
      
      lines.forEach((line, index) => {
        // 주석 무시
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        containerPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            // 허용된 패턴인지 확인
            const allowedPatterns = [
              'min-h-\\[52px\\]',  // 표준 툴바 컨테이너
              'h-\\[53px\\]',      // TabBar
              'min-h-\\[44px\\]',  // 모달 헤더
            ];
            
            const isAllowed = allowedPatterns.some(allowed => 
              new RegExp(allowed).test(line)
            );
            
            if (!isAllowed) {
              issues.push({
                file: filePath,
                line: index + 1,
                rule: 'control-height-on-container',
                severity: 'warning',
                message: '요청하지 않은 컨테이너에 컨트롤 높이 적용됨. 컨트롤만 생성하거나 예외 보고(사용자 승인) 필요',
                code: line.trim(),
              });
            }
          }
          // 패턴 초기화 (global 플래그 때문에 필요)
          pattern.lastIndex = 0;
        });
      });
      
      return issues;
    },
  },
  {
    name: 'non-standard-container-height',
    description: '비표준 컨테이너 높이 사용',
    severity: 'info',
    // 전역: DMS + PMS 컴포넌트
    pathPattern: /apps\/web\/(dms|pms)\/src\/components\//,
    filePattern: /\.(tsx)$/,
    exclude: ['node_modules', 'dist', '.next'],
    check: (content, filePath) => {
      const issues = [];
      const lines = content.split('\n');
      
      // 표준이 아닌 min-h 또는 h 값 감지 (52px, 53px, 44px 외)
      const heightPattern = /(?:min-)?h-\[(\d+)px\]/g;
      
      const standardHeights = [32, 36, 44, 52, 53, 56]; // 표준 높이값들
      
      lines.forEach((line, index) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        let match;
        while ((match = heightPattern.exec(line)) !== null) {
          const height = parseInt(match[1], 10);
          if (!standardHeights.includes(height) && height < 100) {
            issues.push({
              file: filePath,
              line: index + 1,
              rule: 'non-standard-container-height',
              severity: 'info',
              message: `비표준 높이값 ${height}px 사용. 표준: ${standardHeights.join(', ')}px`,
              code: line.trim(),
            });
          }
        }
      });
      
      return issues;
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

function checkFile(filePath) {
  const issues = [];
  
  if (!fs.existsSync(filePath)) {
    return issues;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const rule of DESIGN_RULES) {
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

    const ruleIssues = rule.check(content, filePath);
    issues.push(...ruleIssues);
  }

  return issues;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('✅ 검증할 파일 없음');
    process.exit(0);
  }

  const allIssues = [];

  for (const filePath of args) {
    const issues = checkFile(filePath);
    allIssues.push(...issues);
  }

  // 결과 출력
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const infos = allIssues.filter(i => i.severity === 'info');

  if (allIssues.length > 0) {
    console.log('\n🎨 디자인 패턴 검증 결과\n');

    if (errors.length > 0) {
      console.log('❌ 오류:\n');
      errors.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }

    if (warnings.length > 0) {
      console.log('⚠️ 경고 (예외 보고 권장):\n');
      warnings.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }

    if (infos.length > 0) {
      console.log('ℹ️ 정보:\n');
      infos.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line}`);
        console.log(`    ${issue.message}`);
        console.log(`    > ${issue.code}\n`);
      });
    }

    console.log(`\n총: ${errors.length} 오류, ${warnings.length} 경고, ${infos.length} 정보\n`);
  }

  // 오류가 있으면 exit 1 (현재는 없으나 향후 확장 대비)
  if (errors.length > 0) {
    console.log('❌ 디자인 검증 실패: 오류를 수정 후 다시 시도하세요\n');
    process.exit(1);
  }

  console.log('✅ 디자인 패턴 검증 통과\n');
  process.exit(0);
}

main();
