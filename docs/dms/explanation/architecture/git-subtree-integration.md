# DMS Git Subtree 통합 가이드

> 📅 작성일: 2026-01-27  
> 📌 상태: 이원화 운영 단계 (추후 완전 통합 시 아카이빙 예정)

---

## 1. 개요

DMS(Document Management System)는 별도 개발 조직에서 GitLab으로 독립 개발되며, 통합 모노레포(sooo)는 GitHub로 관리된다. Git Subtree를 사용하여 두 저장소를 연결하고 이원화 운영한다.

### 1.1 저장소 정보

| 항목 | 값 |
|------|-----|
| **통합 모노레포 (GitHub)** | `https://github.com/hwista/sooo.git` |
| **DMS 레포 (GitLab)** | `http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git` |
| **DMS 브랜치** | `main` (실제 소스), `master` (PPT/이미지), `LSWIKI` (README만) |
| **모노레포 내 DMS 경로** | `apps/web/dms/` |

### 1.2 운영 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    이원화 Git 전략                           │
│                                                             │
│   GitLab (DMS 정본)                                         │
│   ┌─────────────┐                                          │
│   │  DMS 레포   │ ←───── DMS팀 push                        │
│   └──────┬──────┘                                          │
│          │                                                  │
│          │ ① pull (작업 전 항상)                             │
│          ▼                                                  │
│   ┌─────────────────────────────────────────┐              │
│   │         로컬 워크스페이스 (조율자)         │              │
│   │  sooo/apps/web/dms                     │              │
│   │                                          │              │
│   │  - GitLab 최신 pull                      │              │
│   │  - 디자인 시스템/통합 작업                 │              │
│   └──────┬──────────────┬───────────────────┘              │
│          │              │                                   │
│          │ ② push       │ ③ push                           │
│          ▼              ▼                                   │
│   ┌───────────┐   ┌───────────┐                            │
│   │  GitHub   │   │  GitLab   │                            │
│   │  모노레포  │   │  DMS 레포  │                            │
│   └───────────┘   └───────────┘                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 초기 설정 (1회)

### 2.1 GitLab Remote 추가

```bash
# 워크스페이스 루트에서 실행
cd C:\WorkSpace\dev\source\sooo

# remote 추가
git remote add gitlab-dms http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git

# 확인
git remote -v
# 결과:
# gitlab-dms  http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git (fetch)
# gitlab-dms  http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git (push)
# origin      https://github.com/hwista/sooo.git (fetch)
# origin      https://github.com/hwista/sooo.git (push)
```

### 2.2 Subtree 추가

```bash
# GitLab 브랜치 확인
git fetch gitlab-dms
git branch -r | Select-String "gitlab-dms"

# DMS 소스 추가 (main 브랜치 사용)
git subtree add --prefix=apps/web/dms gitlab-dms main --squash
```

---

## 3. 일상 작업 워크플로우

### 3.1 작업 전: GitLab 최신 pull

```bash
# 워크스페이스 루트에서 실행
cd C:\WorkSpace\dev\source\sooo

# DMS 최신 소스 가져오기
git subtree pull --prefix=apps/web/dms gitlab-dms main --squash
```

### 3.2 작업 수행 & 커밋

```bash
# 변경사항 커밋 (일반 git 작업)
git add -A
git commit -m "feat(dms): 변경 내용"
```

### 3.3 작업 후: 양쪽 push

```bash
# GitHub push (모노레포)
git push origin main

# GitLab push (DMS 레포)
git subtree push --prefix=apps/web/dms gitlab-dms main
```

### 3.4 권장: 단일 명령으로 양방향 publish + 검증

> 수동 `git push`/`git subtree push` 대신 아래 명령을 표준으로 사용한다.

```bash
# 인증 변수 준비 (또는 local git config 사용)
export GL_USER='gitlab_username'
export GL_TOKEN='gitlab_personal_access_token'
git config --local codex.gitlabUser 'gitlab_username'
git config --local codex.gitlabToken 'gitlab_personal_access_token'

# GitLab subtree가 앞서 있으면 먼저 monorepo로 재통합
pnpm run codex:dms-sync-from-gitlab

# 현재 브랜치 기준 GitHub + GitLab 동시 반영/검증
pnpm run codex:dms-publish

# GitHub target branch만 명시하고 GitLab subtree branch는 기본값(refactor/integration) 사용
pnpm run codex:dms-publish -- dms/refactor/integration

# 다른 GitLab subtree branch를 검사해야 하면 명시적으로 override
DMS_GITLAB_BRANCH='<gitlab-subtree-branch>' pnpm run codex:dms-sync-from-gitlab
DMS_GITLAB_BRANCH='<gitlab-subtree-branch>' pnpm run codex:dms-publish -- dms/refactor/integration
```

기본 동작:
1. GitLab `refactor/integration`이 local subtree split으로 fast-forward 가능한지 먼저 검사
2. 현재 브랜치를 `origin`에 push
3. `apps/web/dms` subtree를 GitLab `refactor/integration`에 push
4. GitLab 원격을 fetch한 뒤 local subtree split hash와 원격 hash 일치 여부 검증

참고:
- DMS 변경이 있는데 `origin`으로 바로 push하면 pre-push guard가 차단한다.
- GitLab subtree가 local split보다 앞서 있으면 `codex:dms-publish`는 GitHub push 전에 중단하고 `codex:dms-sync-from-gitlab` 실행을 안내한다.
- 이 저장소에서는 GitHub target branch와 GitLab subtree branch가 기본적으로 다르다. `codex:dms-publish` 인자는 GitHub target branch만 바꾸고, GitLab subtree branch는 `DMS_GITLAB_BRANCH`로 별도 override한다.
- 예외 우회(권장하지 않음): `CODEX_SKIP_DMS_PUBLISH_GUARD=1 git push ...`

---

## 4. DMS 독립성 유지 원칙

### 4.1 핵심 원칙

> ⚠️ **DMS는 별도 조직에서 독립 개발되므로, ssoo 모노레포 환경의 설정이 DMS 코드에 간섭하면 안 된다.**

| 구분 | 허용 | 금지 |
|------|------|------|
| **설정 파일 수정** | 실행 시 플래그로 해결 | `next.config.js`, `tsconfig.json` 직접 수정 |
| **의존성** | 별도 lockfile 유지 가능 | 모노레포 패키지 강제 적용 |
| **빌드 설정** | 터미널 명령어로 조정 | 빌드 스크립트 직접 수정 |

### 4.2 환경 차이 대응

| 이슈 | 원인 | 해결 방법 |
|------|------|----------|
| Turbopack vs Webpack | Next.js 16+ 기본값 변경 | `--webpack` 플래그 사용 |
| 포트 충돌 | PMS가 3000 사용 | DMS는 자동으로 3001 사용 |
| lockfile 경고 | `package-lock.json` 중복 | 경고 무시 (DMS 원본 유지) |

---

## 5. DMS 빌드 & 실행

### 5.1 개발 모드 실행

```bash
# 방법 1: pnpm filter (워크스페이스 루트에서)
pnpm --filter markdown-wiki dev -- --webpack

# 방법 2: 직접 실행 (DMS 폴더에서)
cd apps/web/dms
npx next dev --webpack

# 방법 3: 포트 지정
npx next dev --webpack -p 3001
```

### 5.2 빌드

```bash
# pnpm filter
pnpm --filter markdown-wiki build

# 또는 직접 실행
cd apps/web/dms
npx next build --webpack
```

### 5.3 전체 모노레포 실행

```bash
# PMS + Server 만 실행 (권장)
pnpm dev

# DMS는 별도 터미널에서
cd apps/web/dms
npx next dev --webpack -p 3001
```

---

## 6. 포트 구성

| 서비스 | 포트 | 비고 |
|--------|------|------|
| **Server (NestJS)** | 4000 | API 서버 |
| **PMS (Next.js)** | 3000 | 프로젝트 관리 |
| **DMS (Next.js)** | 3001 | 문서 관리 |

---

## 7. 문제 해결

### 7.1 spawn EPERM 에러

```
Error: spawn EPERM
```

**원인:** Windows 권한/프로세스 잠금 문제

**해결:**
1. VS Code 터미널 닫고 새로 열기
2. 또는 PC 재부팅
3. 또는 관리자 권한으로 실행

### 7.2 Turbopack 에러

```
ERROR: This build is using Turbopack, with a `webpack` config and no `turbopack` config.
```

**해결:** `--webpack` 플래그 사용
```bash
npx next dev --webpack
```

### 7.3 Subtree 충돌

```
fatal: prefix 'apps/web/dms' already exists.
```

**해결:** 폴더 삭제 후 다시 추가
```bash
git rm -rf apps/web/dms
git commit -m "chore: remove dms for re-add"
git subtree add --prefix=apps/web/dms gitlab-dms main --squash
```

---

## 8. 향후 계획

### 8.1 이원화 단계 (현재)

- DMS팀: GitLab에서 독립 개발
- 조율자: GitHub에서 통합 관점 작업
- 주기적 동기화 (subtree pull/push)

### 8.2 완전 통합 단계 (추후)

- Git 통합: GitLab → GitHub 마이그레이션
- 패키지 통합: `@ssoo/ui` 공용 컴포넌트 분리
- 빌드 통합: Turborepo 파이프라인 통합
- 이 문서 아카이빙: `docs/dms/_archive/`로 이동

---

## 9. 참고 문서

- [Git Subtree 공식 문서](https://git-scm.com/book/en/v2/Git-Tools-Subtree-Merging)
- [Next.js Turbopack 설정](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [모노레포 구조](../../../README.md)
- [DMS 기술 스택](./tech-stack.md)

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | 초기 작성 - Git Subtree 통합 완료 |

## Changelog

| Date | Change |
|------|--------|
| 2026-04-02 | Add `codex:dms-sync-from-gitlab`, preflight GitLab fast-forward checks, and git-config auth fallback for publish. |
| 2026-02-23 | Add `codex:dms-publish` standard flow (GitHub + GitLab + hash verification). |
| 2026-02-09 | Add changelog section. |
