# 0004 A GitHub App creates the release tags

Status: Accepted

## Context

A tag or a pull request that the default workflow token creates does not start other workflows. The Docker workflow runs on a tag, so a release made with the default token would publish no image. A personal access token would work, but it belongs to a person, it cannot make signed commits, and it outlives the person who made it. A version tag also decides which image is called a release, so who can create one matters.

## Decision

Release Please opens the release pull request and creates the tag after it is merged. It uses the token of a GitHub App, and the private key of the App is a secret of the `release` environment that only `main` can use. The release commits are made through the API, so GitHub signs them. The ruleset `release-tags-creation` lets only the App create a tag that starts with `v`, and the ruleset `release-tags` lets nobody delete, move or update one. The owner merges the release pull request and no bot or agent does.

## Consequences

- A tag starts the Docker workflow, which publishes the versioned image.
- A bad release cannot be fixed by moving the tag. The fix is a new patch version.
- Anyone who can merge to `main` could add a workflow that reads the key of the App, so the owner reviews who may merge before adding collaborators.
- The Docker Hub mirror asks GitHub whether the tagged commit is on `main` before it copies a release image.
