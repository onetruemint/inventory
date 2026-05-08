# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `onetruemint/inventory`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Authentication

`gh` requires an authenticated session before any of the commands above will work. If `gh auth status` reports "not logged in," ask the user to run `gh auth login` themselves (it's interactive). Don't try to authenticate non-interactively.

## Triage labels not yet created

The five canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) do not yet exist in the GitHub repo. The first time a skill applies one of these labels, create it first:

```bash
gh label create needs-triage --description "Maintainer needs to evaluate" --color FBCA04
gh label create needs-info --description "Waiting on reporter" --color D4C5F9
gh label create ready-for-agent --description "Fully specified, AFK-ready" --color 0E8A16
gh label create ready-for-human --description "Needs human implementation" --color 1D76DB
gh label create wontfix --description "Will not be actioned" --color CCCCCC
```

`gh label create` is idempotent-friendly: it errors if the label exists, but the error is safe to ignore.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
