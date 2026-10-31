# 0006 Some tools stay one major version behind

Status: Accepted

## Context

A tool that is the newest major version may not work with the plugins around it. The lint setup uses typescript-eslint and the accessibility plugin of JSX, and each of them states the range of versions that it supports.

## Decision

TypeScript stays at 6.0.x, because typescript-eslint supports TypeScript below 6.1 and does not support 7 yet. ESLint stays at 9.x, because the accessibility plugin of JSX supports ESLint up to 9. Every dependency has an exact version in `package.json`, and Renovate proposes updates once a week after a release is seven days old. A major update gets its own pull request, and the plugin that holds a version back is checked in that pull request.

## Consequences

- The newest language and linter features wait until the plugins support them.
- A Renovate pull request for TypeScript 7 or ESLint 10 is expected to fail until the plugins catch up, and it is closed or held until then.
- The versions are a decision that gets reviewed again when a plugin releases support.
