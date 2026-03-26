# 빈 폴더 테스트 시뮬레이션

> .github 문서만으로 프로젝트를 처음부터 구축할 수 있는지 검증하는 테스트

---

## 테스트 목적

**가설**: 빈 폴더 + `.github/` 코어 문서만으로 동일 수준의 프로젝트 구축 가능

**검증 항목**:
1. AI가 .github 문서를 읽고 프로젝트 구조를 이해할 수 있는가?
2. 기술 스택 협의 → 결정 과정이 가이드되는가?
3. 폴더 구조, 설정 파일이 템플릿대로 생성되는가?
4. 코드 작성 시 copilot-instructions 규칙을 따르는가?
5. 품질 수렴 루프가 작동하는가?

---

## 테스트 시나리오

### Phase 0: 환경 준비

```bash
# 테스트 디렉토리 생성
mkdir /tmp/sdd-test-project
cd /tmp/sdd-test-project

# 코어 파일만 선택적 복사 (01-new-project.md 참조)
mkdir -p .github/prompts
cp -r [SDD_SOURCE]/.github/scripts .github/
cp -r [SDD_SOURCE]/.github/agents .github/
cp -r [SDD_SOURCE]/.github/prompts/core .github/prompts/
cp -r [SDD_SOURCE]/.github/guides .github/
cp -r [SDD_SOURCE]/.github/templates .github/
cp [SDD_SOURCE]/.github/README.md .github/
```

### Phase 1: 프로젝트 초기화 대화

AI에게 다음 프롬프트 전달:

```markdown
@workspace

새 프로젝트를 시작하려고 해. .github 폴더에 있는 SDD Framework를 사용해서 진행해줘.

## 프로젝트 개요
- 이름: TestProject
- 목적: SI/SM 조직의 프로젝트 관리 시스템
- MVP 기능: 
  1. 프로젝트 CRUD
  2. 사용자 인증
  3. 대시보드

## 제약 조건
| 항목 | 값 |
|------|-----|
| 팀 규모 | 3명 |
| 익숙한 언어 | TypeScript |
| 마감일 | 3개월 |
| 구조 | 모노레포 |

.github/guides/01-new-project.md를 따라 진행해줘.
```

### Phase 2: 기대 결과 검증

AI 응답에서 확인할 항목:

```markdown
## 체크리스트

### 문서 참조 확인
- [ ] 01-new-project.md 참조함
- [ ] 03-tech-stack.md 참조함
- [ ] _base.md 템플릿 참조함
- [ ] typescript-web.md 템플릿 참조함

### 협의 과정 확인
- [ ] 기술 스택 선정 질문함 (모노레포 vs 멀티레포)
- [ ] 백엔드 프레임워크 선택 안내함
- [ ] 프론트엔드 프레임워크 선택 안내함
- [ ] 데이터베이스 선택 안내함

### 산출물 생성 확인
- [ ] copilot-instructions.md 생성 (템플릿 기반)
- [ ] 폴더 구조 생성 (typescript-monorepo.md 기반)
- [ ] package.json 생성
- [ ] tsconfig.json 생성
- [ ] instructions/*.md 생성

### 품질 검증 확인
- [ ] sdd-verify.js 실행 안내함
- [ ] 품질 점수 표시함
- [ ] 미달 시 수정 진행함
```

### Phase 3: 코드 작성 테스트

```markdown
@developer

User 엔티티와 CRUD API를 구현해줘.
```

**검증 항목**:
- [ ] 기존 패턴 참조 (없으므로 템플릿 참조)
- [ ] copilot-instructions.md 규칙 준수
- [ ] 점검 우선 원칙 적용
- [ ] 품질 수렴 루프 언급

### Phase 4: 최종 검증

```bash
# 구조 검증
node .github/scripts/sdd-verify.js

# 빌드 검증
pnpm install
pnpm build

# 테스트 검증
pnpm test
```

---

## 테스트 결과 기록 템플릿

```markdown
## 빈 폴더 테스트 결과

**테스트 일시**: YYYY-MM-DD HH:MM
**테스트 환경**: [OS, Node 버전 등]

### Phase 1: 프로젝트 초기화
| 항목 | 결과 | 비고 |
|------|------|------|
| 문서 참조 | ✅/❌ | |
| 협의 과정 | ✅/❌ | |
| 산출물 생성 | ✅/❌ | |

### Phase 2: 코드 작성
| 항목 | 결과 | 비고 |
|------|------|------|
| 패턴 준수 | ✅/❌ | |
| 규칙 준수 | ✅/❌ | |

### Phase 3: 품질 검증
| 항목 | 결과 | 비고 |
|------|------|------|
| sdd-verify.js | N% | |
| 빌드 | ✅/❌ | |
| 테스트 | N/N | |

### 결론
- **동일 수준 재현 가능 여부**: ✅/❌
- **발견된 Gap**: 
  - [Gap 1]
  - [Gap 2]
- **개선 필요 항목**:
  - [개선 1]
```

---

## 현재 상태 자체 검증

### .github 필수 파일 존재 여부

| 파일 | 필수 | 존재 | 역할 |
|------|------|------|------|
| `copilot-instructions.md` | ✅ | ✅ | 전역 규칙 (레포 특화) |
| `README.md` | ✅ | ✅ | 구조 설명, 빠른 시작 |
| `agents/common-workflow.md` | ✅ | ✅ | 에이전트 공통 워크플로우 |
| `agents/orchestrator.agent.md` | ✅ | ✅ | 작업 분석, 에이전트 체인 |
| `prompts/core/project-init.prompt.md` | ✅ | ✅ | 프로젝트 초기화 |
| `prompts/core/quality-loop.prompt.md` | ✅ | ✅ | 품질 수렴 루프 |
| `prompts/core/inspect-first.prompt.md` | ✅ | ✅ | 점검 우선 체크리스트 |
| `guides/01-new-project.md` | ✅ | ✅ | 신규 프로젝트 시작 |
| `guides/03-tech-stack.md` | ✅ | ✅ | 기술 스택 선정 |
| `templates/copilot-instructions/_base.md` | ✅ | ✅ | 공통 원칙 템플릿 |
| `templates/copilot-instructions/typescript-web.md` | ✅ | ✅ | TS 스택 템플릿 |
| `templates/folder-structure/typescript-monorepo.md` | ✅ | ✅ | 폴더 구조 템플릿 |

### 빈 폴더 시작 흐름 검증

```
1. AI가 .github/README.md 읽음
   → 빠른 시작 → guides/01-new-project.md 안내
   
2. 01-new-project.md 따라 Phase 0-3 진행
   → Phase 0: 사전 준비 (guides/03-tech-stack.md 참조)
   → Phase 1: 기술 스택 결정
   → Phase 2: 구조 생성 (templates/ 참조)
   → Phase 3: 개발 시작
   
3. 개발 시 agents/common-workflow.md 참조
   → 점검 우선 원칙 적용
   → 품질 수렴 루프 적용
   
4. 검증 시 sdd-verify.js 실행
   → 100% 달성까지 반복
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 초기 버전 생성 |
