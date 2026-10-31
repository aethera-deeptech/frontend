# 0003 Pull requests are merged with merge commits and every commit is signed

Status: Accepted

## Context

GitHub offers three ways to merge. Squashing and rebasing rewrite the commits that were reviewed, and Release Please builds the changelog from the commits that reach `main`. The repository is public, and a commit without a verified signature can claim any author.

## Decision

The ruleset of `main` allows merge commits only, requires a pull request with resolved review threads and strict up to date checks, and requires a verified signature on every commit. The merge commit has the title of the pull request and no body. GitHub signs the merge commit, the update of a branch and the commits of the release App, and authors sign their own commits.

## Consequences

- The commits that were checked by the commit message job are the commits that reach `main`.
- A change can be reverted by reverting its merge commit.
- A contributor needs a signing key. The way to sign commits that are already made is in [CONTRIBUTING.md](../../CONTRIBUTING.md).
- The squash and rebase buttons are off, so an unsigned commit cannot be hidden by them.
