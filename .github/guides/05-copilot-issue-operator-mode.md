# Copilot GitLab issue local operator mode

> 범위: current slice (`issue registration -> prepare -> verify -> report -> branch push`)

이 가이드는 `LSWIKI`에서 GitLab issue를 기준으로 로컬에서 Copilot 작업 브랜치를 준비하고, repo-native verification을 돌린 뒤, GitLab issue state/note를 정리하고 execution branch를 push하는 흐름을 설명한다.

---

## 1. 준비 조건

- GitLab issue는 `.gitlab/issue_templates/copilot-local-issue-run.md` 템플릿으로 작성한다.
- **초기 실행 시작점**은 `ai-exec-ready` label이 붙은 opened issue다.
- GitLab API 접근 정보는 아래 중 하나로 준비한다.
  - 환경변수: `GL_USER`, `GL_TOKEN`
  - 로컬 git config:
    - `git config --local codex.gitlabUser '<gitlab-user>'`
    - `git config --local codex.gitlabToken '<gitlab-token>'`
- remote URL이 SSH이거나 GitLab web/API 주소를 바로 추론하기 어려우면 아래 중 하나를 추가한다.
  - 환경변수: `GL_HOST_URL`, `GL_PROJECT_PATH`
  - 로컬 git config:
    - `git config --local codex.gitlabHostUrl '<gitlab-host-url>'`
    - `git config --local codex.gitlabProjectPath '<group/project>'`
- current slice는 `--issue <iid>`와 `--issues <iid1,iid2>`만 지원한다.
- current slice는 **merge/MR 단계로 넘어가지 않고 branch push에서 멈춘다.**

---

## 2. 기본 흐름

### 단일 issue

```bash
pnpm run copilot:issue:prepare -- --issue 123
pnpm run copilot:issue:verify -- --issue 123
pnpm run copilot:issue:report -- --issue 123
git push origin <execution-branch>
```

### batch issue (`n:1`)

```bash
pnpm run copilot:issue:prepare -- --issues 123,124
pnpm run copilot:issue:verify -- --issues 123,124
pnpm run copilot:issue:report -- --issues 123,124
git push origin <execution-branch>
```

---

## 3. 각 단계의 역할

| 단계 | 명령 | 역할 |
|------|------|------|
| prepare | `copilot:issue:prepare` | GitLab issue contract 검증, execution branch checkout, manifest/normalized spec 생성, issue를 `ai/in-progress`로 전이, structured registry note 등록 |
| verify | `copilot:issue:verify` | baseline + changed-area verification 실행, 로컬 report 생성 |
| report | `copilot:issue:report` | verification 결과를 GitLab issue note와 label state(`ai/verified` 또는 `ai/blocked`)로 반영 |
| push | `git push origin <execution-branch>` | current slice 종료선. merge/MR은 다음 주 범위 |

`prepare`가 만드는 산출물은 `.runtime/copilot-issue/<issue-key>/` 아래에 쌓인다.

주요 파일:

- `manifest.json`
- `normalized-spec.md`
- `prepare-note.md`
- `verification-report.json`
- `verification-report.md`
- `issue-note.md`

---

## 4. label lifecycle

| 상태 | Label | 의미 |
|------|-------|------|
| Ready | `ai-exec-ready` | template/gate 통과, 아직 claim 전 |
| In progress | `ai/in-progress` | active operator와 execution branch가 존재 |
| Verified | `ai/verified` | local verify/report 완료, branch push 기준선 정리 완료 |
| Blocked | `ai/blocked` | 코드/환경/결정 이슈로 진행 중단 |
| Batch member | `ai/batch` | `--issues`로 시작한 batch branch 참여 issue |
| Reserved | `ai/merge-ready` | 다음 주 merge rehearsal 전까지 reserved |

전이 규칙:

1. issue author가 opened issue에 `ai-exec-ready`를 붙인다.
2. `prepare` 성공 시 issue는 `ai/in-progress`로 전이된다.
3. `report`가 통과하면 `ai/verified`, 실패하면 `ai/blocked`로 전이된다.
4. batch 실행이면 participating issue 전부에 `ai/batch`가 같이 붙는다.

---

## 5. structured note semantics

- GitLab issue의 **latest structured note**가 팀 공통 실행 상태를 보여주는 surface다.
- note에는 최소 아래 정보가 들어간다.
  - operator
  - topology (`single` / `batch`)
  - base branch / base ref
  - execution branch
  - participating issues
  - verification status
  - local artifact paths
  - superseded branch
- 다른 operator가 이어받을 때는 issue label과 latest structured note를 먼저 확인한다.
- 한 issue는 동시에 둘 이상의 active execution branch에 들어가지 않는다.

---

## 6. operator 체크리스트

1. GitLab issue를 템플릿으로 만들고 `ai-exec-ready` label을 붙인다.
2. clean worktree에서 `prepare`를 실행한다.
3. checkout된 execution branch에서 Copilot으로 구현을 진행한다.
4. `verify`로 repo-native gate를 통과시킨다.
5. `report`로 GitLab issue note/state를 갱신한다.
6. execution branch를 push한다.
7. merge/PR 단계는 current slice 범위 밖이므로 여기서 멈춘다.

---

## 7. dry-run

세 명령 모두 `--dry-run`을 지원한다.

```bash
pnpm run copilot:issue:prepare -- --issue 123 --dry-run
pnpm run copilot:issue:verify -- --issue 123 --dry-run
pnpm run copilot:issue:report -- --issue 123 --dry-run
```

---

## 8. 현재 verification 규칙

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

## 9. 제한 사항

- local operator artifacts는 `.runtime/` 아래 로컬 산출물이며 commit 대상이 아니다.
- issue body가 템플릿 섹션을 채우지 못하면 `prepare` 단계에서 중단된다.
- closed issue에서는 `prepare`가 중단된다.
- dirty worktree에서는 `prepare`가 중단된다.
- current slice는 **branch push까지만** 다루며 merge/MR/downstream CI/CD는 다음 주 범위다.
