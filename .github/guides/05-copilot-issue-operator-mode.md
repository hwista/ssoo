# Copilot GitLab issue local operator mode

Use the root `pnpm run copilot:issue:*` commands as the stable entry surface. The canonical runbook now lives in [`docs/dms/guides/gitlab-issue-operator-mode.md`](../../docs/dms/guides/gitlab-issue-operator-mode.md), and the execution assets live in [`automation/README.md`](../../automation/README.md).

## Stable command surface

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

`development` finalization은 보수적으로 처리한다. 먼저 `codex:workspace-sync-from-gitlab` 로 최신 `development`를 execution branch에 merge해 drift/conflict를 그 브랜치에서 정리하고, 그 결과만 `codex:workspace-publish -- development` 로 반영한다. target branch가 다시 움직였으면 finalize 전에 같은 sync 단계를 반복한다.

Duplicate close remains explicit:

```bash
pnpm run copilot:issue:close-duplicate -- --issue 124 --canonical 123 --reason '<사용자 승인 근거>'
```

## Source of truth

- Canonical runbook: [`docs/dms/guides/gitlab-issue-operator-mode.md`](../../docs/dms/guides/gitlab-issue-operator-mode.md)
- Automation layout: [`automation/README.md`](../../automation/README.md)
- Issue template: [`.gitlab/issue_templates/copilot-local-issue-run.md`](../../.gitlab/issue_templates/copilot-local-issue-run.md)
- Shared wrapper prompt: [`.github/prompts/ssoo/gitlab-issue-operator.prompt.md`](../prompts/ssoo/gitlab-issue-operator.prompt.md)

## Boundary

- Stateful logic lives under `automation/scripts/copilot-issue/**`.
- Merge/publish transport stays in `codex:workspace-*`.
- Operator runtime artifacts stay under `.runtime/copilot-issue/**`.
