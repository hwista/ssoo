---
title: GitLab issue operator mode
owner: dms-team
status: active
last_reviewed: 2026-05-29
---

# GitLab issue operator mode

> 범위: `duplicate triage comment -> prepare -> verify -> report -> branch push -> safe merge/publish -> merge finalize`

이 가이드는 `LSWIKI`에서 GitLab issue를 canonical tracking record로 유지하면서 로컬 Copilot 작업 브랜치를 준비하고, repo-native verification을 돌린 뒤, GitLab issue state/note와 merge close audit까지 정리하는 흐름을 설명한다.

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
- shared rule은 `automation/scripts/copilot-issue/**`, 이 가이드, issue template, shared prompt wrapper에 둔다. 개인 agent 파일이나 machine-local overlay에는 공통 규칙을 저장하지 않는다.

---

## 2. 기본 흐름

### 단일 issue

```bash
pnpm run copilot:issue:triage -- --issue 123
pnpm run copilot:issue:prepare -- --issue 123
pnpm run copilot:issue:verify -- --issue 123
pnpm run copilot:issue:report -- --issue 123
git push origin <execution-branch>
pnpm run codex:workspace-sync-from-gitlab
pnpm run codex:workspace-publish -- development
pnpm run copilot:issue:merge -- --issue 123 --target development --merged-by '<담당자 이름>'
```

### batch issue (`n:1`)

```bash
pnpm run copilot:issue:triage -- --issue 123
pnpm run copilot:issue:triage -- --issue 124
pnpm run copilot:issue:prepare -- --issues 123,124
pnpm run copilot:issue:verify -- --issues 123,124
pnpm run copilot:issue:report -- --issues 123,124
git push origin <execution-branch>
pnpm run codex:workspace-sync-from-gitlab
pnpm run codex:workspace-publish -- development
pnpm run copilot:issue:merge -- --issues 123,124 --target development --merged-by '<담당자 이름>'
```

### duplicate suspected issue

```bash
pnpm run copilot:issue:triage -- --issue 124 --comment-duplicate --canonical 123 --reason '<중복 판단 근거>'
```

위 명령은 comment와 `ai/blocked` 전이만 수행한다. duplicate suspected issue는 자동 close하지 않는다. 사용자가 직접 GitLab에서 close하거나, 사용자 지시 후 아래 명령으로만 close한다.

```bash
pnpm run copilot:issue:close-duplicate -- --issue 124 --canonical 123 --reason '<사용자 승인 근거>'
```

---

## 3. 각 단계의 역할

| 단계 | 명령 | 역할 |
|------|------|------|
| triage | `copilot:issue:triage` | duplicate 후보 artifact 생성. `--comment-duplicate`가 명시된 경우에만 canonical issue comment를 남기고 open/blocked로 둔다 |
| prepare | `copilot:issue:prepare` | issue contract 검증, active ownership 확인, execution branch checkout, manifest/normalized spec 생성, issue를 `ai/in-progress`로 전이, structured registry note 등록 |
| verify | `copilot:issue:verify` | baseline + changed-area verification 실행, 로컬 report 생성 |
| report | `copilot:issue:report` | verification 결과를 GitLab issue note와 label state(`ai/verified` 또는 `ai/blocked`)로 반영 |
| branch push | `git push origin <execution-branch>` | execution branch를 원격에 게시 |
| safe merge/publish | `codex:workspace-sync-from-gitlab` + `codex:workspace-publish` | `WS-011` safe merge/publish 경로를 재사용해 `development` 원격 push/publish를 검증 |
| merge finalize | `copilot:issue:merge` | reflected branch, merge commit, `mergedBy`, push verification을 note에 남기고 검증 성공 시에만 issue close |

`prepare` 이후 산출물은 `.runtime/copilot-issue/<issue-key>/` 아래에 쌓인다.

주요 파일:

- `manifest.json`
- `normalized-spec.md`
- `prepare-note.md`
- `verification-report.json`
- `verification-report.md`
- `issue-note.md`
- `duplicate-triage.json`
- `duplicate-note.md`
- `merge-note.md`

---

## 4. label lifecycle

| 상태 | Label | 의미 |
|------|-------|------|
| Ready | `ai-exec-ready` | template/gate 통과, 아직 claim 전 |
| In progress | `ai/in-progress` | active operator와 execution branch가 존재 |
| Verified | `ai/verified` | local verify/report 완료 또는 merge close 전 검증 완료 |
| Blocked | `ai/blocked` | 코드/환경/결정/duplicate 의심/push 실패로 진행 중단 |
| Batch member | `ai/batch` | `--issues`로 시작한 batch branch 참여 issue |
| Reserved | `ai/merge-ready` | merge 준비 상태를 별도로 표시할 때 reserved |

전이 규칙:

1. issue author가 opened issue에 `ai-exec-ready`를 붙인다.
2. duplicate 의심이면 `triage --comment-duplicate`가 comment를 남기고 `ai/blocked`로 둔다. 자동 close는 금지한다.
3. `prepare` 성공 시 issue는 `ai/in-progress`로 전이된다.
4. `report`가 통과하면 `ai/verified`, 실패하면 `ai/blocked`로 전이된다.
5. batch 실행이면 participating issue 전부에 `ai/batch`가 같이 붙는다.
6. `merge` 성공 시 원격 push/publish 검증 후 issue를 close한다.
7. local merge는 성공했지만 remote push/publish 검증이 실패하면 issue는 open 상태와 `ai/blocked` label을 유지한다.

---

## 5. structured note semantics

- GitLab issue의 **latest structured note**가 팀 공통 실행 상태를 보여주는 surface다.
- note에는 최소 아래 정보가 들어간다.
  - operator
  - topology (`single` / `batch`)
  - base branch / base ref
  - `executionBranch`
  - `reflectedBranches`
  - participating issues
  - verification status
  - local artifact paths
  - superseded branch
  - duplicate audit (`canonicalIssueIid`, reason, policy)
  - merge audit (`mergeTargetBranch`, `mergeCommit`, `mergedBy`, `pushStatus`, `publishedRemoteRef`, `publishedCommit`)
- 다른 operator가 이어받을 때는 issue label과 latest structured note를 먼저 확인한다.
- 한 issue는 동시에 둘 이상의 active execution branch에 들어가지 않는다.
- 다른 operator/branch가 이미 active면 `prepare`는 중단한다. 이어받기는 `--takeover` 또는 `--supersede`가 명시된 경우에만 superseded lineage note와 함께 허용한다.
- `executionBranch`는 작업/검증/rollback 단위이고, `reflectedBranches`는 실제 반영된 integration branch 목록이다. 두 필드를 서로 덮어쓰지 않는다.

---

## 6. merge close gate

- `development` local merge는 intermediate state다.
- `development` 대상 issue close는 아래가 모두 통과해야 한다.
  1. 현재 branch가 `development`
  2. execution branch가 `HEAD`의 ancestor
  3. worktree clean
  4. `origin/development` 또는 지정 remote/target이 local `HEAD`와 동일
  5. `codex:workspace-publish`가 남긴 `codex.gitlabLastPublished` marker가 local `HEAD`와 동일
- 위 조건이 하나라도 실패하면 `copilot:issue:merge`는 failure note를 남기고 issue를 `ai/blocked`로 유지하며 close하지 않는다.
- `mergedBy`는 필수이며 우선순위는 `--merged-by` -> first assignee display name -> GitLab user -> git user name이다.

---

## 7. shared agent wrapper boundary

- baseline packaging은 `.github/prompts/ssoo/gitlab-issue-operator.prompt.md` shared prompt wrapper다.
- wrapper는 절차와 체크리스트를 제공할 뿐, GitLab/git/merge/publish stateful 로직을 복제하지 않는다.
- stateful 로직은 항상 `automation/scripts/copilot-issue/**`와 `codex:workspace-*` publish script를 호출한다.
- skill extraction은 후속 옵션이며 baseline operation의 전제 조건이 아니다.

---

## 8. operator 체크리스트

1. GitLab issue를 템플릿으로 만들고 `ai-exec-ready` label을 붙인다.
2. `triage`로 duplicate 후보를 확인한다.
3. duplicate로 판단되면 canonical issue 번호와 근거 comment를 남기고 사용자 close 결정을 기다린다.
4. clean worktree에서 `prepare`를 실행한다.
5. checkout된 execution branch에서 Copilot으로 구현을 진행한다.
6. `verify`로 repo-native gate를 통과시킨다.
7. `report`로 GitLab issue note/state를 갱신한다.
8. execution branch를 push한다.
9. `WS-011` safe merge/publish 경로로 `development`에 반영하고 원격 push/publish를 검증한다.
10. `merge`로 reflected branch와 merge audit를 기록한 뒤 issue를 close한다.

---

## 9. dry-run

모든 operator 명령은 `--dry-run`을 지원한다.

```bash
pnpm run copilot:issue:triage -- --issue 123 --dry-run
pnpm run copilot:issue:prepare -- --issue 123 --dry-run
pnpm run copilot:issue:verify -- --issue 123 --dry-run
pnpm run copilot:issue:report -- --issue 123 --dry-run
pnpm run copilot:issue:close-duplicate -- --issue 124 --canonical 123 --reason 'same failure' --dry-run
pnpm run copilot:issue:merge -- --issue 123 --target development --dry-run
```

---

## 10. 현재 verification 규칙

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

## 11. 제한 사항

- local operator artifacts는 `.runtime/` 아래 로컬 산출물이며 commit 대상이 아니다.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-05-29 | automation execution asset relocation과 canonical runbook 승격을 반영 |
