#!/usr/bin/env node

/**
 * SDD Framework 검증 스크립트
 * 
 * .github 문서의 규칙과 코드베이스의 일치 여부를 검증합니다.
 * 
 * 사용법:
 *   node .github/scripts/sdd-verify.js           # 전체 검증
 *   node .github/scripts/sdd-verify.js --quick   # 빠른 검증 (필수 항목만)
 *   node .github/scripts/sdd-verify.js --report  # JSON 리포트 생성
 *   node .github/scripts/sdd-verify.js --fix     # 자동 수정 가능한 항목 수정
 * 
 * 품질 수렴 루프:
 *   측정 → 분석 → 개선 → 재측정 → 100% 수렴
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
};

// 결과 수집
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
};

function addResult(category, check, status, message) {
  results.details.push({ category, check, status, message });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else if (status === 'warn') results.warnings++;
}

// ───────────────────────────────────────────────────────────────
// 검증 함수들
// ───────────────────────────────────────────────────────────────

/**
 * 1. .github 구조 검증
 */
function verifyGitHubStructure() {
  log.header('.github 구조 검증');
  
  const requiredFiles = [
    '.github/copilot-instructions.md',
    '.github/README.md',
    '.github/agents/common-workflow.md',
    '.github/agents/orchestrator.agent.md',
    '.github/prompts/core/feature-dev.prompt.md',
  ];
  
  const requiredDirs = [
    '.github/agents',
    '.github/prompts/core',
    '.github/instructions',
  ];
  
  // 필수 파일 확인
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log.success(`${file} 존재`);
      addResult('structure', file, 'pass', '파일 존재');
    } else {
      log.error(`${file} 누락`);
      addResult('structure', file, 'fail', '파일 누락');
    }
  }
  
  // 필수 디렉토리 확인
  for (const dir of requiredDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      log.success(`${dir}/ 존재`);
      addResult('structure', dir, 'pass', '디렉토리 존재');
    } else {
      log.error(`${dir}/ 누락`);
      addResult('structure', dir, 'fail', '디렉토리 누락');
    }
  }
}

/**
 * 2. instructions 파일과 실제 경로 매핑 검증
 */
function verifyInstructionsMapping() {
  log.header('Instructions 매핑 검증');
  
  const instructionsDir = path.join(process.cwd(), '.github/instructions');
  if (!fs.existsSync(instructionsDir)) {
    log.warn('instructions 폴더 없음');
    addResult('mapping', 'instructions/', 'warn', '폴더 없음');
    return;
  }
  
  const instructionFiles = fs.readdirSync(instructionsDir)
    .filter(f => f.endsWith('.instructions.md'));
  
  for (const file of instructionFiles) {
    const filePath = path.join(instructionsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // applyTo 패턴 추출
    const applyToMatch = content.match(/applyTo:\s*["']([^"']+)["']/);
    if (applyToMatch) {
      const applyTo = applyToMatch[1];
      const basePath = applyTo.split('/**')[0].replace(/\*/g, '');
      
      if (basePath && fs.existsSync(path.join(process.cwd(), basePath))) {
        log.success(`${file} → ${basePath} 경로 존재`);
        addResult('mapping', file, 'pass', `${basePath} 매핑 확인`);
      } else if (basePath) {
        log.error(`${file} → ${basePath} 경로 없음`);
        addResult('mapping', file, 'fail', `${basePath} 경로 없음`);
      }
    }
  }
}

/**
 * 3. 와일드카드 export 검증
 */
function verifyNoWildcardExports() {
  log.header('와일드카드 Export 검증');
  
  let violations = [];
  
  try {
    const result = execSync(
      `grep -r "export \\* from" --include="*.ts" apps/ packages/ 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "dist" || true`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    if (result.trim()) {
      const lines = result.trim().split('\n');
      for (const line of lines) {
        // @prisma/client re-export는 허용
        if (!line.includes('@prisma/client')) {
          violations.push(line);
        }
      }
    }
  } catch (e) {
    // grep 실패 시 무시
  }
  
  if (violations.length === 0) {
    log.success('와일드카드 export 없음');
    addResult('patterns', 'wildcard-export', 'pass', '위반 없음');
  } else {
    log.error(`와일드카드 export ${violations.length}개 발견`);
    for (const v of violations.slice(0, 5)) {
      log.error(`  ${v.substring(0, 100)}`);
    }
    addResult('patterns', 'wildcard-export', 'fail', `${violations.length}개 위반`);
  }
}

/**
 * 4. any 타입 사용 검증
 * eslint-disable 주석이 있는 경우는 허용 (의도적 사용)
 */
function verifyNoAnyType() {
  log.header('any 타입 검증');
  
  try {
    const result = execSync(
      `grep -rn ": any" --include="*.ts" --include="*.tsx" apps/ packages/ 2>/dev/null | grep -v "node_modules" | grep -v ".d.ts" | grep -v ".next" | grep -v "dist" || true`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    let lines = result.trim().split('\n').filter(l => l.trim());
    
    // eslint-disable 주석이 있는 any는 의도적 사용으로 허용
    const unintentionalAny = [];
    for (const line of lines) {
      if (line) {
        // 해당 파일에서 eslint-disable 확인
        const parts = line.split(':');
        const filePath = parts[0];
        const lineNum = parseInt(parts[1], 10);
        
        if (filePath && !isNaN(lineNum)) {
          try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const fileLines = fileContent.split('\n');
            
            // 이전 줄에 eslint-disable-next-line이 있으면 허용
            const prevLine = fileLines[lineNum - 2] || '';
            if (prevLine.includes('eslint-disable-next-line') && prevLine.includes('any')) {
              continue; // 의도적 사용, 스킵
            }
          } catch (e) {
            // 파일 읽기 실패 시 위반으로 처리
          }
        }
        unintentionalAny.push(line);
      }
    }
    
    if (unintentionalAny.length === 0) {
      log.success('any 타입 사용 없음 (또는 모두 eslint-disable로 허용됨)');
      addResult('patterns', 'any-type', 'pass', '위반 없음');
    } else {
      log.warn(`any 타입 사용 ${unintentionalAny.length}개 발견`);
      for (const v of unintentionalAny.slice(0, 3)) {
        log.warn(`  ${v.substring(0, 80)}`);
      }
      addResult('patterns', 'any-type', 'warn', `${unintentionalAny.length}개 사용`);
    }
  } catch (e) {
    log.info('any 타입 검사 스킵');
  }
}

/**
 * 5. 문서 파일명 규칙 검증 (kebab-case)
 */
function verifyDocNaming() {
  log.header('문서 파일명 규칙 검증');
  
  try {
    const result = execSync(
      `find docs -name "*_*" -type f -name "*.md" 2>/dev/null | grep -v "_archive" | grep -v "reference" || true`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    const lines = result.trim().split('\n').filter(l => l.trim());
    
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
      log.success('문서 파일명 kebab-case 준수');
      addResult('docs', 'naming', 'pass', '규칙 준수');
    } else {
      log.warn(`snake_case 파일명 ${lines.length}개 발견`);
      for (const v of lines.slice(0, 5)) {
        log.warn(`  ${v}`);
      }
      addResult('docs', 'naming', 'warn', `${lines.length}개 위반`);
    }
  } catch (e) {
    log.info('문서 파일명 검사 스킵');
  }
}

/**
 * 6. 빌드 성공 검증
 */
function verifyBuild(quick = false) {
  if (quick) {
    log.info('빠른 검증 모드: 빌드 스킵');
    return;
  }
  
  log.header('빌드 검증');
  
  try {
    log.info('pnpm lint 실행 중...');
    execSync('pnpm lint', { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' });
    log.success('pnpm lint 성공');
    addResult('build', 'lint', 'pass', '성공');
  } catch (e) {
    log.error('pnpm lint 실패');
    addResult('build', 'lint', 'fail', '실패');
  }
  
  try {
    log.info('pnpm build 실행 중...');
    execSync('pnpm build', { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' });
    log.success('pnpm build 성공');
    addResult('build', 'build', 'pass', '성공');
  } catch (e) {
    log.error('pnpm build 실패');
    addResult('build', 'build', 'fail', '실패');
  }
}

/**
 * 7. copilot-instructions.md 필수 섹션 검증
 */
function verifyCopilotInstructions() {
  log.header('copilot-instructions.md 검증');
  
  const filePath = path.join(process.cwd(), '.github/copilot-instructions.md');
  if (!fs.existsSync(filePath)) {
    log.error('copilot-instructions.md 없음');
    addResult('instructions', 'existence', 'fail', '파일 없음');
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredSections = [
    { name: '핵심 원칙', pattern: /핵심\s*원칙|core\s*principles/i },
    { name: '기술 스택', pattern: /기술\s*스택|tech\s*stack/i },
    { name: '네이밍 규칙', pattern: /네이밍\s*규칙|naming\s*conventions?/i },
    { name: '폴더/레이어 구조', pattern: /폴더\s*구조|folder\s*structure|레이어\s*아키텍처|layer\s*architecture/i },
    { name: '금지 사항', pattern: /금지\s*사항|forbidden|prohibited/i },
    { name: 'Diátaxis 문서 구조', pattern: /Diátaxis|diataxis/i },
    { name: 'Gate 체크', pattern: /Gate\s*체크|gate\s*check/i },
    { name: '백로그 우선순위', pattern: /백로그\s*우선순위|backlog\s*priority|IMM|P1/i },
  ];
  
  for (const section of requiredSections) {
    if (section.pattern.test(content)) {
      log.success(`${section.name} 섹션 존재`);
      addResult('instructions', section.name, 'pass', '섹션 존재');
    } else {
      log.warn(`${section.name} 섹션 누락`);
      addResult('instructions', section.name, 'warn', '섹션 누락');
    }
  }
}

/**
 * 8. 템플릿 동기화 검증 (범용 원칙이 _base.md에도 있는지)
 */
function verifyTemplateSynchronization() {
  log.header('템플릿 동기화 검증');
  
  const baseTemplatePath = path.join(process.cwd(), '.github/templates/copilot-instructions/_base.md');
  if (!fs.existsSync(baseTemplatePath)) {
    log.warn('_base.md 템플릿 없음');
    addResult('template', 'existence', 'warn', '템플릿 없음');
    return;
  }
  
  const content = fs.readFileSync(baseTemplatePath, 'utf8');
  
  // 범용 원칙 (모든 프로젝트에 적용되어야 할 항목)
  const universalSections = [
    { name: '코드 클렌징 원칙', pattern: /코드\s*클렌징/i },
    { name: '문서-코드 동기화', pattern: /문서-코드\s*동기화|문서.*동기화/i },
    { name: '증거 기반 작업', pattern: /증거\s*기반/i },
    { name: '승인 프로세스', pattern: /승인\s*프로세스/i },
    { name: 'Gate 체크', pattern: /Gate\s*체크/i },
    { name: 'Diátaxis', pattern: /Diátaxis|diataxis/i },
    { name: '정본 원칙', pattern: /정본\s*원칙|깃헙독스|GitHub\s*Docs/i },
    { name: '품질 수렴 루프', pattern: /품질\s*수렴\s*루프|quality.*100%/i },
  ];
  
  for (const section of universalSections) {
    if (section.pattern.test(content)) {
      log.success(`_base.md: ${section.name} 존재`);
      addResult('template', section.name, 'pass', '범용 원칙 포함');
    } else {
      log.warn(`_base.md: ${section.name} 누락`);
      addResult('template', section.name, 'warn', '범용 원칙 누락');
    }
  }
}

/**
 * 9. Diátaxis 문서 구조 검증
 */
function verifyDiataxisStructure() {
  log.header('Diátaxis 문서 구조 검증');
  
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    log.warn('docs/ 폴더 없음');
    addResult('diataxis', 'docs-folder', 'warn', 'docs/ 없음');
    return;
  }
  
  // Diátaxis 필수 요소
  const requiredElements = [
    { name: 'getting-started.md (Tutorial)', path: 'docs/getting-started.md' },
    { name: 'README.md (Hub)', path: 'docs/README.md' },
  ];
  
  // 존재하면 Diátaxis 구조 검증할 도메인 폴더들
  const domainDirs = [];
  try {
    const entries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        domainDirs.push(entry.name);
      }
    }
  } catch (e) {
    // 무시
  }
  
  // 필수 요소 확인
  for (const element of requiredElements) {
    const elementPath = path.join(process.cwd(), element.path);
    if (fs.existsSync(elementPath)) {
      log.success(`${element.name} 존재`);
      addResult('diataxis', element.name, 'pass', '존재');
    } else {
      log.warn(`${element.name} 누락`);
      addResult('diataxis', element.name, 'warn', '누락');
    }
  }
  
  // 도메인별 Diátaxis 구조 검증 (architecture/ 또는 guides/ 존재 여부)
  for (const domain of domainDirs) {
    const domainPath = path.join(docsDir, domain);
    const hasArchitecture = fs.existsSync(path.join(domainPath, 'architecture'));
    const hasGuides = fs.existsSync(path.join(domainPath, 'guides'));
    const hasReference = fs.existsSync(path.join(domainPath, 'reference'));
    
    if (hasArchitecture || hasGuides || hasReference) {
      log.success(`docs/${domain}/ Diátaxis 구조 확인`);
      addResult('diataxis', `${domain}/`, 'pass', 'Diátaxis 구조');
    } else {
      // 도메인 폴더가 있지만 Diátaxis 하위 폴더가 없음 - 경고
      log.warn(`docs/${domain}/ Diátaxis 하위 폴더 없음`);
      addResult('diataxis', `${domain}/`, 'warn', 'Diátaxis 하위 폴더 없음');
    }
  }
}

// ───────────────────────────────────────────────────────────────
// 메인 실행
// ───────────────────────────────────────────────────────────────

function getConvergenceStatus(score) {
  if (score === 100) return { status: '✅ 완료', converged: true };
  if (score >= 95) return { status: '⚠️ 경미한 이슈', converged: false };
  if (score >= 90) return { status: '🔶 개선 필요', converged: false };
  return { status: '🔴 즉시 조치 필요', converged: false };
}

function printSummary() {
  log.header('검증 결과 요약');
  
  console.log(`
  ${colors.green}통과: ${results.passed}${colors.reset}
  ${colors.yellow}경고: ${results.warnings}${colors.reset}
  ${colors.red}실패: ${results.failed}${colors.reset}
  `);
  
  const total = results.passed + results.warnings + results.failed;
  const score = Math.round((results.passed / total) * 100);
  const convergence = getConvergenceStatus(score);
  
  console.log(`  품질 점수: ${score}%`);
  console.log(`  수렴 상태: ${convergence.status}`);
  
  // JSON 리포트 저장 (--report 옵션)
  if (process.argv.includes('--report')) {
    const report = {
      timestamp: new Date().toISOString(),
      score,
      convergence: convergence.status,
      converged: convergence.converged,
      passed: results.passed,
      warnings: results.warnings,
      failed: results.failed,
      details: results.details,
    };
    
    const reportPath = path.join(process.cwd(), '.github', 'quality-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log.info(`리포트 저장: ${reportPath}`);
  }
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}❌ 검증 실패${colors.reset}`);
    console.log('  실패 항목을 수정 후 다시 실행하세요.');
    console.log(`\n  ${colors.cyan}다음 단계: Gap 분석 → 개선 → 재측정${colors.reset}`);
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log(`\n${colors.yellow}⚠️ 경고 있음${colors.reset}`);
    console.log('  경고 항목 검토를 권장합니다.');
    console.log(`\n  ${colors.cyan}100% 달성까지 ${100 - score}% 남음${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.green}✅ 모든 검증 통과 - 품질 수렴 완료!${colors.reset}`);
    process.exit(0);
  }
}

function main() {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     SDD Framework 검증 스크립트        ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
  
  if (quick) {
    log.info('빠른 검증 모드');
  }
  
  // 검증 실행
  verifyGitHubStructure();
  verifyInstructionsMapping();
  verifyCopilotInstructions();
  verifyTemplateSynchronization();
  verifyDiataxisStructure();
  verifyNoWildcardExports();
  verifyNoAnyType();
  verifyDocNaming();
  verifyBuild(quick);
  
  // 결과 출력
  printSummary();
}

main();
