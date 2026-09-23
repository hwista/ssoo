````mdc
# 공용 문서 (Common)

> 최종 업데이트: 2026-09-17

PMS와 DMS 모두에 공통 적용되는 개발 표준, 가이드, 아키텍처 문서입니다.

---

## 🔗 깃헙독스 참조

> **📌 개발 프로세스 표준**은 [깃헙독스 (.github/)](../../.github/)에서 관리됩니다.
>
> 이 문서들(레포독스)은 **SSOO 프로젝트의 결과물**을 설명하며,  
> **개발 방법론**은 깃헙독스에 정본으로 존재합니다.

### SDD Framework 핵심 개념

| 개념 | 설명 | 참조 |
|------|------|------|
| **점검 우선 원칙** | 변경 전 반드시 현황 분석 | [inspect-first.prompt.md](../../.github/templates/inspect-first.prompt.md) |
| **품질 수렴 루프** | 측정→분석→개선→재측정 | [quality-loop.prompt.md](../../.github/templates/quality-loop.prompt.md) |
| **4단계 검증** | 스택별 재현 가능성 검증 | [sdd-verify.js](../../scripts/sdd-verify.js) |
| **증거 기반 작업** | 추정 금지, 사실만 기술 | [copilot-instructions.md](../../.github/copilot-instructions.md) |

---

## 📁 문서 구조

### 루트 문서

| 문서 | 설명 |
|------|------|
| [출시 준비 5단계 실행 계획](explanation/architecture/2026-09-11-launch-ralph-plan.md) | 전 서비스 검증과 CRM 선행 정리, DMS 및 공용 사용 환경 보존 경계 |
| [알림 연결 오류 후속](explanation/architecture/2026-09-17-notification-stream-handoff.md) | 원인 재현·공통 내부 수정과 재접속/만료 검증, 승인 집계 유지 |
| [계약 초안 내부 승인 결과](explanation/architecture/2026-09-17-contract-internal-approval-handoff.md) | 실제 지정 승인자 한 명의 요청·처리·이력 완료·19완료/3잔여 |
| [계약 생성 기록 처리 결과](explanation/architecture/2026-09-17-contract-records-handoff.md) | 앞선 1번 처리 범위의 기록·실제 승인 구현 이전 결과 |
| [계약 승인 기록 검토·처리안](explanation/architecture/2026-09-17-contract-approval-review.md) | 생성 기록과 실제 결재 구분·1번 선택 승인 기록 |
| [커뮤니티 첨부 완료 핸드오프](explanation/architecture/2026-09-17-post-attachments-handoff.md) | 공유·링크·이미지 전체 완료·18완료/4잔여·운영 증거 0/5 |
| [커뮤니티 공유 단계 핸드오프](explanation/architecture/2026-09-17-post-sharing-handoff.md) | 공유 완료/첨부 2개 미완료·17완료/5잔여·운영 증거 0/5 |
| [로그인 유지 토큰 재사용 차단 핸드오프](explanation/architecture/2026-09-16-token-replay-handoff.md) | 승인-22 완료·총 22항목 17완료/5대기·기존 세션 1회 재로그인·운영 증거 0/5 |
| [로그인 전 세션 확인 핸드오프](explanation/architecture/2026-09-16-anonymous-session-handoff.md) | 승인-09 완료·신규 승인-22·총 22항목 16완료/6대기·운영 증거 0/5 |
| [답글 원문 검사 핸드오프](explanation/architecture/2026-09-16-reply-parent-handoff.md) | 승인-21 완료·완료 +1/신규 0·총 21항목 15완료/6대기 |
| [댓글 열람·작성 핸드오프](explanation/architecture/2026-09-16-comments-handoff.md) | 승인-04 완료 당시의 댓글 열람·작성 검증 기록 |
| [게시판 생성 핸드오프](explanation/architecture/2026-09-16-board-creation-handoff.md) | 승인-03 완료 당시의 생성·검증 기록 |
| [공용 프로필 갱신 핸드오프](explanation/architecture/2026-09-16-profile-refresh-handoff.md) | 승인-20 완료 당시의 즉시 갱신·검증 기록 |
| [공용 프로필 상태 핸드오프](explanation/architecture/2026-09-15-profile-state-handoff.md) | 승인-19 완료 당시의 상태 처리·검증 기록 |
| [공용 프로필 활성 상태](explanation/architecture/profile-active-state.md) | 조회·저장 거절과 갱신 표시 및 기존 활성 동작 보존 기준 |
| [전문가 검색 핸드오프](explanation/architecture/2026-09-15-expert-search-handoff.md) | 승인-02 완료·승인-19 신규 발견·총 10완료/9대기 |
| [검색 직접 접속·복원 핸드오프](explanation/architecture/2026-09-15-search-entry-handoff.md) | 승인-18 완료·관련 회귀 20/20·완료 +1/추가 0·총 9완료/9대기 |
| [네 서비스 검색 가림 개선 핸드오프](explanation/architecture/2026-09-14-service-search-panel-handoff.md) | 승인-17 완료·관련 회귀 15/15·승인-18 검색 복원 대기·총 8완료/10대기 |
| [고객관리 검색 가림 개선 핸드오프](explanation/architecture/2026-09-14-crm-search-panel-handoff.md) | 좁은 화면 결과 우선 노출 완료·다른 서비스 보존·총 7완료/10대기 |
| [고객관리 검색 접속 복구 핸드오프](explanation/architecture/2026-09-14-crm-search-route-handoff.md) | 검색 주소 복구 완료 당시 검증 기록 |
| [고객관리 탭 한도 핸드오프](explanation/architecture/2026-09-14-crm-tab-limit-handoff.md) | 입력 연결·탭 한도 완료 당시 검증 기록 |
| [영업기회 입력 연결 핸드오프](explanation/architecture/2026-09-14-crm-input-binding-handoff.md) | 입력 연결 완료 당시의 클릭 36/36·저장/잠금 검증 및 후속 탭 한도 기록 |
| [크기 전환 입력 보존 핸드오프](explanation/architecture/2026-09-11-launch-approval14-handoff.md) | 승인-14 완료 당시의 정량 검증과 후속 입력 연결 발견 기록 |
| [출시 준비 사용자 승인 대장](explanation/architecture/2026-09-11-launch-approval-register.md) | 임의 변경 없이 별도로 모으는 사용자 검토 항목 |
| [AGENTS.md](AGENTS.md) | 모노레포 에이전트 학습 가이드 (필독) |

### explanation/architecture/ - 아키텍처 & 개발 표준

| 문서 | 설명 |
|------|------|
| [current-workstream-baseline.md](explanation/architecture/current-workstream-baseline.md) | 현재 DMS/PMS/SNS 작업축 상태, stop/continue boundary, 실행 순서, 병렬 규칙 |
| [current-tranche-execution-contract.md](explanation/architecture/current-tranche-execution-contract.md) | dirty tree 재기준선화 후 현재 tranche 실행 계약 |
| [current-tranche-inventory-freeze.md](explanation/architecture/current-tranche-inventory-freeze.md) | 현재 tranche inventory freeze 와 첫 수정 대상 고정 |
| [tech-stack.md](explanation/architecture/tech-stack.md) | 공용 기술 스택 (백엔드, DB, 개발도구) |
| [development-standards.md](explanation/architecture/development-standards.md) | 개발 표준 (계층 구조, SRP, 컴포넌트 설계) |
| [security-standards.md](explanation/architecture/security-standards.md) | 보안 표준 (인증, 인가, 데이터 보호) |
| [auth-system.md](explanation/architecture/auth-system.md) | 인증 시스템 (JWT, 토큰 갱신, 보안 정책) |
| [auth-profile-boundary.md](explanation/architecture/auth-profile-boundary.md) | Account/Auth + Admin + SNS Profile 책임 경계와 앱별 로그인 wrapper 기준 |
| [user-lifecycle-commonization.md](explanation/architecture/user-lifecycle-commonization.md) | SSOO 5앱 공용 사용자 생명주기 완료 기준과 logout/session-revoke acceptance gate |
| [user-lifecycle-commonization-plan.md](explanation/architecture/user-lifecycle-commonization-plan.md) | 공용 사용자 생명주기 적용을 위한 단계별 구현 계획 |
| [search-input-autofill-integrity-ralph-plan.md](explanation/architecture/search-input-autofill-integrity-ralph-plan.md) | SSOO 5앱 검색·필터·자격증명 입력 의미 분리와 이중 autofill 방어 Ralph 계획 |
| [settings-admin-control-plane.md](explanation/architecture/settings-admin-control-plane.md) | SSOO 설정/Admin/Auth/Profile/AI/DMS 책임 경계와 Admin 후속 구현 체크리스트 |
| [ai-rag-platform-roadmap.md](explanation/architecture/ai-rag-platform-roadmap.md) | 공용 AI/RAG data plane, retrieval, conversation/run, model gateway, domain adapter 확장 로드맵과 진척도 |
| [ai-rag-platform-handoff.md](explanation/architecture/ai-rag-platform-handoff.md) | AI/RAG 공용화 현재 구현 상태, 검증 증거, Docker rebuild workaround, 원격 publish/다음 smoke 작업 핸드오프 |
| [content-page-assembly-standard.md](explanation/architecture/content-page-assembly-standard.md) | content-area 내부 페이지 조립 표준, web-shell page recipe/material 경계, DMS 문서 페이지 골든 이그잼플 |
| [platform-content-page-runtime-handoff.md](explanation/architecture/platform-content-page-runtime-handoff.md) | 플랫폼 shell/content-page 강제화 완료 상태, Docker/runtime 검증 증거, 운영/설정/제어 후속 작업 핸드오프 |
| [local-port-map.md](explanation/architecture/local-port-map.md) | SSOO 로컬/Docker 포트 정본과 주변 프로젝트 충돌 회피 기준 |
| [workflow-process.md](explanation/architecture/workflow-process.md) | 개발 작업 프로세스 (코드→문서→커밋) |
| [docs-management.md](explanation/architecture/docs-management.md) | 문서 관리 전략 (자동/수동 구분) |
| [docs-structure-plan.md](explanation/architecture/docs-structure-plan.md) | 문서 구조 계획 |
| [refactoring-audit-prompt.md](explanation/architecture/refactoring-audit-prompt.md) | 리팩토링 감사 프롬프트 |
| [modular-monolith.md](explanation/architecture/modular-monolith.md) | 모듈러 모놀리스 아키텍처 (백엔드) |
| [server-package-spec.md](explanation/architecture/server-package-spec.md) | Server 패키지 명세 |
| [database-package-spec.md](explanation/architecture/database-package-spec.md) | Database 패키지 명세 |
| [types-package-spec.md](explanation/architecture/types-package-spec.md) | Types 패키지 명세 |

### guides/ - 사용 가이드

| 문서 | 설명 |
|------|------|
| [api-guide.md](guides/api-guide.md) | REST API 사용 가이드 |
| [database-guide.md](guides/database-guide.md) | 데이터베이스 사용 가이드 |
| [rules.md](guides/rules.md) | 데이터베이스 설계 규칙 |
| [bigint-guide.md](guides/bigint-guide.md) | BigInt 처리 가이드 |

### reference/ - 자동 생성 문서

| 폴더 | 설명 | 생성 도구 |
|------|------|----------|
| api/ | REST API 명세 | OpenAPI/Redoc |
| db/ | ERD, DBML | Prisma DBML |
| typedoc/ | 코드 API 레퍼런스 | TypeDoc |

---

## 시스템별 문서

- [PMS 문서](../pms/README.md) - 프로젝트 관리 시스템
- [SNS 문서](../sns/README.md) - 커뮤니티 관리 시스템
- [DMS 문서](../dms/README.md) - 도큐먼트 관리 시스템

````
