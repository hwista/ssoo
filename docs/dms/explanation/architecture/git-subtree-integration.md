# DMS GitHub-GitLab Workspace 통합 가이드

> 📅 작성일: 2026-01-27  
> 🔄 최종 업데이트: 2026-04-07  
> 📌 상태: 이원화 운영 + GitLab workspace mirror 단계 (legacy subtree 정보 포함)

---

## 1. 개요

DMS(Document Management System)는 GitHub 모노레포와 GitLab 원격을 함께 유지한다. 현재 표준 흐름은 **GitHub current branch + GitLab workspace branch `development` 동시 반영** 이며, 과거 `apps/web/dms/` subtree 전략은 legacy 운영 이력으로 남아 있다.

### 1.1 저장소 정보

| 항목 | 값 |
|------|-----|
| **통합 모노레포 (GitHub)** | `https://github.com/hwista/sooo.git` |
| **DMS 레포 (GitLab)** | `http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git` |
| **GitLab 운영 브랜치** | `development` (workspace mirror), `refactor/integration` (legacy subtree), `dms/refactor/integration` (historical mirror) |
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

## 2. 레거시 subtree 초기 설정 (archive)

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

## 3. 현재 표준 작업 워크플로우

### 3.1 작업 전: GitLab workspace 최신 sync

```bash
# 워크스페이스 루트에서 실행
cd C:\WorkSpace\dev\source\sooo

# GitLab workspace branch가 앞서 있으면 먼저 로컬 monorepo에 재통합
pnpm run codex:workspace-sync-from-gitlab

# legacy alias
pnpm run codex:dms-sync-from-gitlab
```

### 3.2 작업 수행 & 커밋

```bash
# 변경사항 커밋 (일반 git 작업)
git add -A
git commit -m "feat(dms): 변경 내용"
```

### 3.3 작업 후: 표준 workspace publish

> 작업 후 표준 경로는 개별 `git push`가 아니라 `codex:workspace-publish`다.  
> 이 명령이 GitHub/GitLab 반영과 검증, 그리고 pre-push guard marker 갱신까지 함께 처리한다.

```bash
# 인증 변수 준비 (또는 local git config 사용)
export GL_USER='gitlab_username'
export GL_TOKEN='gitlab_personal_access_token'
git config --local codex.gitlabUser 'gitlab_username'
git config --local codex.gitlabToken 'gitlab_personal_access_token'

# GitLab workspace branch가 앞서 있으면 먼저 monorepo로 재통합
pnpm run codex:workspace-sync-from-gitlab

# 현재 HEAD 기준 GitHub + GitLab workspace 동시 반영/검증
pnpm run codex:workspace-publish

# GitHub target branch만 명시하고 GitLab workspace branch는 기본값(development) 사용
pnpm run codex:workspace-publish -- dms/refactor/integration

# 다른 GitLab workspace branch를 검사해야 하면 명시적으로 override
WORKSPACE_GITLAB_BRANCH='<gitlab-workspace-branch>' pnpm run codex:workspace-sync-from-gitlab
WORKSPACE_GITLAB_BRANCH='<gitlab-workspace-branch>' pnpm run codex:workspace-publish -- dms/refactor/integration

# legacy alias
pnpm run codex:dms-sync-from-gitlab
pnpm run codex:dms-publish -- dms/refactor/integration
```

기본 동작:
1. GitLab `development`가 local HEAD로 fast-forward 가능한지 먼저 검사
2. 현재 브랜치를 `origin`에 push
3. local HEAD를 GitLab workspace branch `development`에 push
4. GitLab 원격을 fetch한 뒤 local HEAD hash와 원격 hash 일치 여부 검증

참고:
- origin으로 바로 push하면 pre-push guard가 `codex.gitlabLastPublished` marker 기준으로 차단한다.
- `codex:workspace-publish`가 성공하면 이 marker가 현재 HEAD로 갱신되고, 같은 HEAD에 대한 direct origin push가 다시 허용된다.
- GitLab workspace branch가 local HEAD보다 앞서 있으면 `codex:workspace-publish`는 GitHub push 전에 중단하고 `codex:workspace-sync-from-gitlab` 실행을 안내한다.
- 이 저장소에서는 GitHub target branch와 GitLab workspace branch가 기본적으로 다를 수 있다. `codex:workspace-publish` 인자는 GitHub target branch만 바꾸고, GitLab workspace branch는 `WORKSPACE_GITLAB_BRANCH`로 별도 override한다.
- legacy alias: `codex:dms-sync-from-gitlab`, `codex:dms-publish`
- 예외 우회(권장하지 않음): `CODEX_SKIP_GITLAB_PUBLISH_GUARD=1 git push ...`

---

### 3.4 예외: 수동 recovery push (비권장)

> `codex:workspace-publish` 자체를 디버깅하거나 원격 상태를 복구해야 할 때만 사용한다.

```bash
# pre-push guard 우회가 필요하므로 예외 변수 명시
CODEX_SKIP_GITLAB_PUBLISH_GUARD=1 git push origin HEAD:<github-branch>
git push http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git HEAD:development
```

- 수동 recovery는 GitHub/GitLab hash 검증과 publish marker 갱신을 자동으로 처리하지 않는다.
- 복구가 끝나면 표준 경로로 다시 한 번 `pnpm run codex:workspace-publish -- <github-branch>`를 실행해 marker와 검증 상태를 정상화한다.

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

### 7.3 GitLab workspace branch divergence

```
[workspace-publish] aborting before GitHub push: GitLab branch cannot fast-forward to local HEAD.
```

**해결:** 먼저 GitLab workspace branch를 monorepo로 재통합한 뒤 다시 publish
```bash
pnpm run codex:workspace-sync-from-gitlab

# legacy alias
pnpm run codex:dms-sync-from-gitlab
```

---

## 8. 향후 계획

### 8.1 이원화 단계 (현재)

- 조율자: GitHub current branch와 GitLab `development` workspace branch를 함께 반영
- GitLab `refactor/integration` subtree branch는 legacy reference로 유지
- 표준 동기화는 workspace sync/publish 명령으로 수행

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
| 2026-04-07 | Make `codex:workspace-publish` the canonical post-commit flow, demote raw dual pushes to recovery-only, and document the publish marker/pre-push guard behavior. |
| 2026-04-06 | Replace the subtree-only standard flow with GitLab workspace branch `development`, add `codex:workspace-sync-from-gitlab` / `codex:workspace-publish`, and keep `codex:dms-*` as compatibility wrappers. |
| 2026-04-02 | Add `codex:dms-sync-from-gitlab`, preflight GitLab fast-forward checks, and git-config auth fallback for publish. |
| 2026-02-23 | Add `codex:dms-publish` standard flow (GitHub + GitLab + hash verification). |
| 2026-02-09 | Add changelog section. |
