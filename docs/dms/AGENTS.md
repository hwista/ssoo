# DMS 에이전트 가이드 (AGENTS)

> 최종 업데이트: 2026-02-04  
> 범위: DMS 프로젝트 (`apps/web/dms/` + `docs/dms/`) 전용

---

## 이 문서의 목적

새로운 에이전트(AI 또는 개발자)가 DMS 작업을 시작할 때 **반드시 먼저 읽어야 하는 가이드**입니다.

**이 문서의 역할**:
- 📋 **온보딩 가이드** - DMS 프로젝트 이해
- 🔄 **작업 프로세스** - 변경/삭제 시 따라야 할 절차
- ✅ **체크리스트** - 작업 전/후 확인 사항
- 📊 **현황 관리** - Backlog/Changelog 관리

**규칙/패턴 참조**:
> 📌 코드 작성 시 적용되는 **상세 규칙 참조 경로**:
> - Codex 진입점: [`AGENTS.md`](../../AGENTS.md)
> - Codex DMS 규칙: [`.codex/instructions/dms.instructions.md`](../../.codex/instructions/dms.instructions.md)
> - DMS 규칙: [.github/instructions/dms.instructions.md](../../.github/instructions/dms.instructions.md)
> - 전역 규칙: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)

---

## 📜 작업 표준 프로세스 (필수 준수)

### 1. 변경 작업 흐름

```
코드 변경 → 문서 업데이트 → 빌드 검증 → 커밋 → 양방향 배포
```

| 단계 | 내용 |
|------|------|
| **1. 코드 변경** | 패턴 표준 준수, 영향 범위 파악 |
| **2. 문서 업데이트** | 관련 문서의 Backlog/Changelog 갱신 |
| **3. 빌드 검증** | `npm run build` 성공 확인 |
| **4. 커밋** | 변경 내용과 문서를 함께 커밋 |
| **5. GitLab workspace 동기화** | 원격 GitLab workspace branch가 앞서 있으면 `pnpm run codex:workspace-sync-from-gitlab` 실행 |
| **6. 양방향 배포** | `pnpm run codex:workspace-publish` 실행 (GitHub + GitLab workspace + 사전검사 + 검증) |

### 2. 삭제/수정 작업 흐름

```
분석 → 브리핑 → 승인 대기 → 실행 → 검증 → 기록
```

| 단계 | 내용 |
|------|------|
| **1. 분석** | grep 검색으로 사용처 확인, 영향 범위 파악 |
| **2. 브리핑** | 대상, 사유, 영향 파일 목록 보고 |
| **3. 승인 대기** | 🔒 **사용자 컨펌 필수** |
| **4. 실행** | 승인 후 변경 수행 |
| **5. 검증** | 빌드/런타임 테스트 |
| **6. 기록** | Changelog에 변경 내역 기록 |

### 3. 삭제 전 검증

```bash
# 1. 빌드 성공 확인
npm run build

# 2. 개발 서버 실행
npm run dev
```

---

## ✅ 작업 전 체크리스트

### 필수 확인

- [ ] `apps/web/dms/` 하위에서만 작업하는지 확인
- [ ] 이 문서(AGENTS.md)를 읽었는지 확인
- [ ] `package.json` 의존성 확인 (외부 workspace 패키지 없는지)
- [ ] Copilot 규칙 확인: `dms.instructions.md`

### 코드 변경 시

- [ ] 기존 패턴과 일치하는지 확인
- [ ] 타입 정의와 구현 일치하는지 확인
- [ ] 불필요한 코드 추가하지 않았는지 확인
- [ ] 빌드 테스트 (`npm run build`)

### 문서 변경 시

- [ ] Backlog/Changelog 섹션 업데이트
- [ ] 관련 문서 링크 유효성 확인

---

## 📁 DMS 문서 구조

### AI 규칙 (정본)

| 파일 | 역할 |
|------|------|
| `AGENTS.md` | Codex 진입점 및 참조 순서 |
| `.codex/instructions/dms.instructions.md` | Codex DMS 개발 규칙 |
| `.github/instructions/dms.instructions.md` | DMS 개발 규칙 (자동 적용) |
| `.github/copilot-instructions.md` | 전역 규칙 |

### 상세 참조 문서: `docs/dms/`

| 폴더 | 내용 |
|------|------|
| `explanation/architecture/` | 기술 스택, 패키지 구조, 상태 관리 |
| `explanation/domain/` | 서비스 개요, 핵심 기능 |
| `explanation/design/` | 디자인 시스템 |
| `guides/` | 개발 가이드 (Hooks, Components, API) |
| `planning/` | 로드맵, 백로그, 변경이력 |

### 핵심 참조 문서

| 문서 | 경로 |
|------|------|
| **문서 인덱스** | `docs/dms/README.md` |
| **기술 스택** | `docs/dms/explanation/architecture/tech-stack.md` |
| **패키지 구조** | `docs/dms/explanation/architecture/package-spec.md` |
| **상태 관리** | `docs/dms/explanation/architecture/state-management.md` |
| **컴포넌트 가이드** | `docs/dms/guides/components.md` |
| **훅 가이드** | `docs/dms/guides/hooks.md` |
| **API 가이드** | `docs/dms/guides/api.md` |

---

## 📊 현재 상태 (2026-02-04)

### 완료된 작업

| 작업 | 내용 |
|------|------|
| **Copilot 규칙 분리** | AGENTS → dms.instructions.md로 규칙 이관 |
| **구조 정리** | 폴더 구조 표준화 완료 |
| **Dead Code 정리** | 미사용 API/서비스/컴포넌트 삭제 (~2,000줄) |
| **패턴 표준화** | 미들웨어, 스토어, 서비스 패턴 통일 |
| **문서 구조** | 정본 위치 확정, 아카이브 분리 |

### 진행 중

| 항목 | 상태 |
|------|------|
| 문서별 Backlog/Changelog 적용 | 🔄 진행중 |
| 문서-코드 일치성 검증 | 🔄 진행중 |

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| AG-01 | DMS 문서별 Backlog/Changelog 섹션 확대 적용 | P1 | 🔄 진행중 |
| AG-02 | package-spec.md 실제 의존성과 일치 확인 | P1 | ⬜ 대기 |
| AG-03 | verification-report.md 참조 경로 수정 | P2 | ⬜ 대기 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-06 | GitLab 기본 흐름을 full-workspace `development` branch 기준으로 전환하고 `codex:workspace-*` 표준 명령/legacy alias 안내를 반영 |
| 2026-04-02 | `codex:dms-sync-from-gitlab`와 `codex:dms-publish` 사전검사/인증 fallback 흐름 반영 |
| 2026-02-23 | DMS 정본 경로를 `docs/dms/`로 단일화하고 참조 경로를 갱신 |
| 2026-02-23 | DMS 양방향 배포 단계 추가 (`pnpm run codex:dms-publish`) |
| 2026-02-22 | Codex 참조 경로(`AGENTS.md`, `.codex/instructions/dms.instructions.md`) 추가 |
| 2026-02-04 | **리팩토링**: Copilot 규칙으로 이관된 내용 삭제 (AI 작업 원칙, DMS 핵심 원칙, Dead Code 기준) |
| 2026-02-04 | **리팩토링**: Copilot 규칙과 역할 분리, 중복 제거, 온보딩/프로세스 가이드로 전환 |
| 2026-02-02 | **대규모 업데이트**: AI 작업 원칙, 코드 패턴 표준, Dead Code 기준 추가 |
| 2026-02-02 | 핵심 원칙에 "이유" 설명 추가 (학습 가이드화) |
| 2026-02-02 | 현재 상태 현행화 (Phase 8 완료 반영) |
| 2026-01-28 | AGENTS 최초 작성 |
