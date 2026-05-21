# Copilot GitLab issue local operator mode

> 범위: current slice (`issue registration -> local verification/report`)

이 가이드는 `LSWIKI`에서 GitLab issue를 기준으로 로컬에서 Copilot 작업 브랜치를 준비하고, repo-native verification을 돌린 뒤, 결과를 다시 GitLab issue note로 남기는 흐름을 설명한다.

---

## 1. 준비 조건

- GitLab issue는 `.gitlab/issue_templates/copilot-local-issue-run.md` 템플릿으로 작성한다.
- 실행 대상 issue에는 `ai-exec-ready` label이 있어야 한다.
- GitLab API 접근 정보는 아래 둘 중 하나로 준비한다.
  - 환경변수: `GL_USER`, `GL_TOKEN`
  - 로컬 git config:
    - `git config --local codex.gitlabUser '<gitlab-user>'`
    - `git config --local codex.gitlabToken '<gitlab-token>'`
- current slice는 `--issue <iid>`와 `--issues <iid1,iid2>`만 지원한다.
- current slice는 merge 전까지만 다룬다.

---

## 2. 기본 흐름

### 단일 issue

```bash
pnpm run copilot:issue:prepare -- --issue 123
pnpm run copilot:issue:verify -- --issue 123
pnpm run copilot:issue:report -- --issue 123
```

### batch issue (`n:1`)

```bash
pnpm run copilot:issue:prepare -- --issues 123,124
pnpm run copilot:issue:verify -- --issues 123,124
pnpm run copilot:issue:report -- --issues 123,124
```

---

## 3. 각 단계의 역할

| 단계 | 명령 | 역할 |
|------|------|------|
| prepare | `copilot:issue:prepare` | GitLab issue contract 검증, execution branch checkout, normalized spec/manifest 생성 |
| verify | `copilot:issue:verify` | baseline + changed-area verification 실행, 로컬 report 생성 |
| report | `copilot:issue:report` | verification 결과를 GitLab issue note로 등록 |

`prepare`가 만드는 산출물은 `.runtime/copilot-issue/<issue-key>/` 아래에 쌓인다.

주요 파일:

- `manifest.json`
- `normalized-spec.md`
- `verification-report.json`
- `verification-report.md`
- `issue-note.md`

---

## 4. operator 체크리스트

1. GitLab issue를 템플릿으로 만들고 `ai-exec-ready` label을 붙인다.
2. clean worktree에서 `prepare`를 실행한다.
3. checkout된 execution branch에서 Copilot으로 구현을 진행한다.
4. `verify`로 repo-native gate를 통과시킨다.
5. `report`로 GitLab issue note를 남긴다.
6. merge/PR 단계는 current slice 범위 밖이다.

---

## 5. dry-run

세 명령 모두 `--dry-run`을 지원한다.

```bash
pnpm run copilot:issue:prepare -- --issue 123 --dry-run
pnpm run copilot:issue:verify -- --issue 123 --dry-run
pnpm run copilot:issue:report -- --issue 123 --dry-run
```

---

## 6. 현재 verification 규칙

기본 baseline:

- `pnpm run codex:verify-sync`
- `pnpm run codex:preflight`
- `pnpm run codex:push-guard`
- `pnpm lint`

changed-area 추가 규칙:

- `apps/server/**` -> server type-check + `pnpm build:server`
- `apps/web/pms/**` -> PMS type-check + `pnpm build:web-pms`
- `apps/web/cms/**` -> CMS type-check + `pnpm build:web-cms`
- `apps/web/dms/**` -> DMS type-check + `pnpm build:web-dms`
- `apps/web/admin/**` -> Admin type-check + `pnpm build:web-admin`
- `packages/database/**` 또는 auth/access boundary -> `@ssoo/database build` + `pnpm verify:access-ci`
- `packages/types/**` -> `@ssoo/types build`

---

## 7. 제한 사항

- GitHub issue / GitHub Actions 기반 orchestration은 current slice 대상이 아니다.
- local operator artifacts는 `.runtime/` 아래 로컬 산출물이며 commit 대상이 아니다.
- issue body가 템플릿 섹션을 채우지 못하면 `prepare` 단계에서 중단된다.
- dirty worktree에서는 `prepare`가 중단된다.
