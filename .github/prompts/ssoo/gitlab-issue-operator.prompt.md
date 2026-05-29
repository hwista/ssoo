# GitLab issue operator shared wrapper

> Purpose: shared prompt wrapper for the `LSWIKI` GitLab issue operator. This wrapper coordinates the repo scripts; it does not replace their stateful GitLab/git/merge/publish logic.

## Use when

- A GitLab issue with `ai-exec-ready` must be handled by an AI/operator.
- Duplicate issue triage is needed before implementation.
- An execution branch must be prepared, verified, reported, pushed, and finalized into `development`.

## Non-negotiable rules

1. Treat the GitLab issue as the canonical tracking record.
2. Run duplicate triage before prepare.
3. If an issue is suspected duplicate, post a canonical issue comment first and leave it open/blocked. Do not auto-close.
4. Close a duplicate only after explicit user/operator instruction through `copilot:issue:close-duplicate`.
5. Check latest structured note before claiming an issue. Do not overwrite another active operator/branch without `--takeover` or `--supersede`.
6. Keep `executionBranch` and `reflectedBranches` separate.
7. Use `codex:workspace-sync-from-gitlab` and `codex:workspace-publish` for `development` finalization.
8. Treat shared integration branch finalization conservatively: sync the latest target branch into the execution branch first, resolve/verify there, and only then reflect the execution branch back into the target branch. If the target branch moves again before finalization, repeat the sync/verify cycle.
9. Prefer merge over rebase for that shared-branch refresh step unless the operator explicitly asked for another strategy.
10. Close merged issues only after remote push/publish verification passes.
11. Record `mergedBy`; prefer explicit `--merged-by`.
12. Keep shared rules in repo scripts/docs/templates. Do not place common rules in personal agent files or local overlays.

## Command sequence

```bash
pnpm run copilot:issue:triage -- --issue <iid>
pnpm run copilot:issue:prepare -- --issue <iid>
pnpm run copilot:issue:verify -- --issue <iid>
pnpm run copilot:issue:report -- --issue <iid>
git push origin <execution-branch>
pnpm run codex:workspace-sync-from-gitlab
pnpm run codex:workspace-publish -- development
pnpm run copilot:issue:merge -- --issue <iid> --target development --merged-by '<담당자 이름>'
```

`codex:workspace-sync-from-gitlab` is the required target-into-execution sync step. Re-run it if `development` moved before `copilot:issue:merge`.

## Duplicate comment path

```bash
pnpm run copilot:issue:triage -- --issue <duplicate-iid> --comment-duplicate --canonical <canonical-iid> --reason '<중복 판단 근거>'
```

Only run the close command after explicit user/operator instruction:

```bash
pnpm run copilot:issue:close-duplicate -- --issue <duplicate-iid> --canonical <canonical-iid> --reason '<사용자 승인 근거>'
```

## Implementation boundary

- Stateful logic lives in `automation/scripts/copilot-issue/**`.
- Merge/publish transport lives in `codex:workspace-*` scripts.
- This wrapper is an instruction layer only.
- Skill extraction may be considered later, but it must not become a baseline requirement.
