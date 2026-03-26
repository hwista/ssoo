# SSOO Codex Global Instructions

> 최종 업데이트: 2026-02-27
> Codex 전역 프로토콜 정본

## 핵심 원칙 (12개)

1. **코드 정리**: 사용 코드만 유지, 미사용 코드 즉시 삭제, 조기 추상화 금지
2. **코드-문서 동기화**: 변경 시 관련 docs/planning/changelog 동시 반영
3. **증거 기반**: 추정 대신 코드/문서/스크립트 실행 결과로 판단
4. **승인 프로세스**: 탐색 → 분석 → 계획 → 사용자 승인 → 실행
5. **점검 우선**: 구현 전 영향 범위 탐색 우선
6. **패키지 경계**: `apps/` → `packages/` 방향만, 역방향/순환 참조 금지
7. **일관성**: 기존 코드 패턴 참조 우선, 새 패턴 도입 시 사용자 승인 필요
8. **불확실성**: 추정 대신 `[NEEDS CLARIFICATION: ...]` 사용 (최대 3개)
9. **사전 게이트 (SDD)**: Simplicity, Anti-Abstraction, Integration 체크
10. **비판적 수용**: 사용자 요청도 기술적 타당성 검증 후 수행, 무조건 긍정 금지
11. **기존 결과 보존**: 새 작업이 기존 기능·동작·UI 외형을 왜곡·축소·변형 금지
12. **패턴 최우선 + 경계 관리**: 워크스페이스 패턴 동일 적용, 역할/책임 경계 명확, 비대화 방지

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProjectCard.tsx` |
| 훅 | use 접두사 + camelCase | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 타입/인터페이스 | PascalCase | `User`, `ProjectDto` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 스토어 | kebab-case + `.store.ts` | `tab.store.ts` |
| 디렉토리-파일 | prefix 생략 | `editor/Toolbar.tsx` ✅, `editor/EditorToolbar.tsx` ❌ |

## 레이어 아키텍처

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조 가능
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

## Codex 프로토콜 키워드

| 키워드 | 수행 항목 |
|--------|-----------|
| `CODEX 실행` | 브리핑 → 작업 → 문서화 → 검증 → 완료 보고 전체 실행 |
| `브리핑 필수` | 작업 시작 브리핑만 수행 |
| `문서화` | 문서 갱신 단계만 수행 |
| `검증 실행` | preflight + 설계된 검증 스크립트 실행 |
| `진행현황` | 작업 진행률 및 남은 항목 보고 |
| `커밋 전 확인` | 체크리스트와 커밋 후보 메시지 출력 |

## 작업 시작 브리핑 최소 항목

- 요청 요약
- 영향 경로
- 참조할 instruction 파일
- 실행 계획(단계/검증)

## 검증 기본 순서

1. `node .codex/scripts/verify-codex-sync.js`
2. `node .github/scripts/check-docs.js` (문서 영향 시)
3. `node .github/scripts/check-patterns.js` (코드 영향 시)
4. `node .github/scripts/check-typography.js` (UI/타이포 영향 시)
5. 필요 시 `node .github/scripts/check-design.js` + 앱 빌드

## 문서 계층 원칙

| 계층 | 경로 | 역할 |
|------|------|------|
| Codex 규칙 정본 | `.codex/instructions/` | Codex CLI 전용 |
| GitHubDocs 규칙 정본 | `.github/` | GitHub Copilot (전체 정본) |
| Claude Code 미러 | `CLAUDE.md` | Claude Code 전용 |
| 레포 산출물 정본 | `docs/`, `docs/dms/` | 배포용 문서 |

## 금지 사항 (12개)

1. **와일드카드 export** (`export * from`)
2. **any 타입 사용** - `unknown` 또는 구체적 타입 사용
3. **역방향 의존성** - ui가 pages 참조, packages가 apps 참조
4. **미사용 코드 커밋** - Dead Code는 삭제
5. **불필요한 추상화** - BaseService 등
6. **문서 갱신 없이 코드 커밋**
7. **근거 없는 추정** - 증거 없이 "~일 것 같음" 금지
8. **요청하지 않은 컨테이너 래핑**
9. **디렉토리명 접두사 파일명 중복**
10. **사용자 요청의 무조건적 수용/긍정** - 기술적 타당성 검증 없이 그대로 수행
11. **기존 기능·동작·UI 외형의 왜곡/축소/변형** - 새 작업이 기존 결과물을 훼손
12. **역할/책임 경계 무시한 비대 모듈** - 하나의 파일/컴포넌트에 과도한 책임 집중

## 커밋 메시지 형식

```
<type>(<scope>): <subject>

Type: feat|fix|docs|style|refactor|perf|test|chore
Scope: server|web-pms|web-dms|database|types|docs
```

## UI 디자인 규칙

- 요청한 컨트롤만 생성, 요청하지 않은 컨테이너 감싸기 금지
- 컨트롤 높이 표준 준수 (세부 값은 각 도메인 design-system.md 참조)
- 폰트는 전역 정의 상속, 개별 폰트 정의 금지 (`font-mono`, `font-sans`만 허용)
- 타이포는 semantic token 우선 사용 (`text-title-*`, `text-body-*`, `text-label-*`, `text-caption`, `text-code-*`)
- raw 조합(`text-sm font-medium`, `text-xs font-medium`, `text-lg font-semibold` 등)은 token으로 치환

## 품질 게이트 체크리스트

작업 완료 전 확인:

- [ ] 코드 변경 완료
- [ ] 관련 문서 Changelog 업데이트
- [ ] Dead Code 없음 확인
- [ ] any 타입 없음 확인
- [ ] 린트/빌드 오류 없음
- [ ] 검증 스크립트 통과

## 동기화 규칙

- 핵심 섹션은 `.codex/config/sync-manifest.json` 기준으로 자동 검증
- 불일치 발생 시 GitHubDocs 정본 → Codex 미러 → CLAUDE.md 미러 순서로 업데이트
- 검증 실패 상태에서 커밋/푸시 진행 금지

## 멀티 에이전트 동기화

- 정본: `.github/` (GitHub Copilot)
- 미러: `.codex/instructions/` (Codex CLI), `CLAUDE.md` (Claude Code)
- 규칙 변경 시: 정본 먼저 → 미러 반영 → `verify-codex-sync.js` 실행
- 검증 실패 시 커밋 차단

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-27 | 핵심 원칙 3개 추가 (10.비판적 수용, 11.기존 결과 보존, 12.패턴 최우선+경계 관리), 금지 사항 3개 추가 |
| 2026-02-27 | 3-에이전트 하모나이제이션: 원칙 12개로 확장, 네이밍/레이어/금지 12개/UI/커밋/품질게이트/멀티에이전트 섹션 추가 |
| 2026-02-25 | 요청 해석 원칙 추가(지시 범위 준수, 모호 시 질문, 과대 해석 금지) |
| 2026-02-22 | Codex 전역 정본 신설 |
