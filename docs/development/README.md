# DMS 개발 문서

> 최종 업데이트: 2026-02-03  
> 정본 위치: `apps/web/dms/docs/development/`

마크다운 위키 시스템(DMS)의 개발 관련 문서입니다.

---

## 🚀 빠른 시작

> **새 개발자를 위한 필수 문서**

| 문서 | 설명 |
|------|------|
| [**guides/getting-started.md**](guides/getting-started.md) | **개발 환경 설정 (필독)** - 설치, 환경변수, 실행 |
| [**AGENTS.md**](AGENTS.md) | **에이전트 학습 가이드 (필독)** |

---

## 📁 문서 구조

### 수동 관리 문서

| 폴더 | 설명 | 주요 내용 |
|------|------|----------|
| **[architecture/](architecture/)** | 아키텍처/기술 표준 | 기술 스택, 패키지 구조 |
| **[domain/](domain/)** | 비즈니스 개념 | 서비스 개요, 핵심 기능 |
| **[design/](design/)** | UI/UX 설계 | 디자인 시스템, 컴포넌트 스타일 |
| **[guides/](guides/)** | 개발 가이드 | 환경 설정, Hooks, Components, API |
| **[planning/](planning/)** | 프로젝트 관리 | 로드맵, 백로그, 변경이력 |

---

## 📚 핵심 문서

| 문서 | 설명 |
|------|------|
| [guides/getting-started.md](guides/getting-started.md) | **개발 환경 설정** - 설치, 환경변수, 실행 |
| [architecture/tech-stack.md](architecture/tech-stack.md) | 기술 스택 |
| [architecture/package-spec.md](architecture/package-spec.md) | 패키지 구조 및 의존성 |
| [domain/service-overview.md](domain/service-overview.md) | 서비스 개요 |
| [design/design-system.md](design/design-system.md) | 디자인 시스템 |
| [guides/hooks.md](guides/hooks.md) | 커스텀 훅 가이드 |
| [guides/components.md](guides/components.md) | 컴포넌트 가이드 |
| [guides/api.md](guides/api.md) | API 엔드포인트 가이드 |
| [planning/roadmap.md](planning/roadmap.md) | 개발 로드맵 |
| [planning/backlog.md](planning/backlog.md) | 백로그 |
| [planning/changelog.md](planning/changelog.md) | 변경 이력 |

---

## 📂 아카이브

기존 문서들은 `../_archive/`에 보관되어 있습니다:

| 문서 | 상태 |
|------|------|
| [README-original.md](../_archive/README-original.md) | 루트 README 백업 (989줄) |
| [DEVELOPMENT_STANDARDS.md](../_archive/DEVELOPMENT_STANDARDS.md) | 참조용 유지 |
| [deployment.md](../_archive/deployment.md) | 참조용 유지 |
| hooks.md, components.md, api.md 등 | 신규 문서로 대체됨 |

---

## 🔗 모노레포 연동

이 문서들은 DMS GitLab 레포지토리의 정본입니다.  
모노레포(`hwista-ssoo`)에서는 아래 위치에서 참조합니다:

- **모노레포 참조**: `docs/dms/README.md`
- **통합 가이드**: `docs/dms/architecture/git-subtree-integration.md`

---

## 📊 문서 커버리지

| 항목 | 문서화 | 상태 |
|------|--------|------|
| API 엔드포인트 | 19/19 | ✅ 100% |
| 컴포넌트 | 35/35 | ✅ 100% |
| 훅 | 9/9 | ✅ 100% |

상세 내용은 [verification-report.md](verification-report.md)를 참조하세요.

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DOC-01 | 문서별 Backlog/Changelog 섹션 도입 상태 정리 | P1 | 🔄 진행중 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-03 | getting-started.md 추가 및 빠른 시작 섹션 신설 |
| 2026-01-27 | 문서 인덱스 초안 작성 |
| 2026-01-28 | AGENTS 문서 추가 및 인덱스 갱신 |
