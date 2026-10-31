# CI/CD

## Workflows

| Workflow | Trigger | What it does |
|:---|:---|:---|
| `commits.yaml` | pull requests | Lints the commits of the pull request with commitlint and its Conventional Commits rules, which are set in `commitlint.config.mjs`, and checks the pull request title against the same types. It never cancels a run, skips an edit that changes neither the title nor the base branch, and reads the title from the pull request when it runs, so editing the body of a pull request cannot leave a cancelled required check behind and a rerun checks the current title. Merge commits are skipped, and the line lengths of the body and footer are not limited because Renovate writes long ones |
| `prformat.yaml` | pull requests | Checks that the branch is named `type/short-description` with a type of Conventional Commits, that the pull request has a label and an assignee, and that the body is only hyphen bullets with text. A pull request that a bot opened (Renovate, Dependabot or Release Please) from its own branch is skipped. It never cancels a run and reads the pull request when it runs, so a label or an assignee that was added later is picked up by a rerun of the failed run or by an edit of the body. Adding a label or an assignee starts no run, and the newest run of the check is the one that counts |
| `config.yaml` | push to main, pull requests, manual | Lints the configuration of the repository with the four jobs below |
| `ci.yaml` | push to main, pull requests, manual | Checks the app with four jobs that run in parallel and install with `npm ci`. Every job uses the Node.js version of `.node-version` |

### Jobs

| Workflow | Job | What it checks |
|:---|:---|:---|
| `commits.yaml` | Conventional commits | The commit messages with commitlint and the pull request title with a pattern for the same types |
| `prformat.yaml` | PR format | The branch name, the label, the assignee and the body of the pull request |
| `config.yaml` | Actionlint | The syntax and the expressions of every workflow, with actionlint |
| `config.yaml` | Zizmor | The workflows for security problems, such as unpinned actions, broad permissions and injection through expressions, with zizmor |
| `config.yaml` | File names | The names of the files and folders against `.ls-lint.yml`, with ls-lint |
| `config.yaml` | Renovate config | `renovate.json` with the Renovate validator in strict mode |
| `ci.yaml` | Typecheck | `tsc -b` over the app and the Vite config |
| `ci.yaml` | Lint | ESLint with the strict type checked rules of typescript-eslint, the React hooks rules and the accessibility rules of jsx-a11y, then the Prettier check |
| `ci.yaml` | Unit tests | The Vitest tests with coverage. The job fails when the total statement, branch, function or line coverage drops under the floor of `vite.config.ts`, and it uploads `coverage/lcov.info` to Codecov |
| `ci.yaml` | Build | `npm run build`, which typechecks and builds the app with Vite |

## Required checks

The ruleset of `main` requires a pull request that is merged with a merge commit, resolved review threads, branches that are up to date with `main` (strict checks), and it refuses deletion and force pushes. Signed commits are not required yet.

Every check below is required and is reported by GitHub Actions.

| Check | Reported by | Required |
|:---|:---|:---|
| Conventional commits | GitHub Actions | yes |
| PR format | GitHub Actions | yes |
| Actionlint | GitHub Actions | yes |
| Zizmor | GitHub Actions | yes |
| File names | GitHub Actions | yes |
| Renovate config | GitHub Actions | yes |

The four jobs of `ci.yaml` (Typecheck, Lint, Unit tests and Build) are not in the ruleset yet. They are added to the ruleset and to this table once they have reported on a pull request, and the same goes for `codecov/patch` after its first report.

Each check was added to the ruleset after it had reported once on a pull request, because GitHub only offers a check that it has seen. Every check is pinned to the app that reports it, so another app cannot post a check with the same name. Add a new check to the ruleset in the same change that introduces it, and update this page in that change too.

## Dependency updates

Renovate opens the update pull requests when its GitHub App runs on the repository, and `renovate.json` holds its rules. It runs on Mondays before 07:00 WIB, proposes a release only after it is 7 days old, and groups minor and patch updates of Actions (`actions`) and of npm packages (`npm-minor-patch`). A major update gets its own pull request. The commit type is `ci` for Actions and the tools of the workflows, and `build` for npm packages, so neither is a `feat` or a `fix`. The bot keeps an issue called Dependency Dashboard with every update it knows about. Security fixes ignore the schedule and the 7 day wait. Renovate learns about them from the Dependabot alerts of the repository, so those alerts need to stay on.

## Pinned tools

The bot cannot read a tool that is named inside a `run` step, so the tools of the jobs are listed where it can.

- `.github/tools/Dockerfile` has one stage for each image that a job starts with `docker run`, which are actionlint and zizmor. Nothing builds it. The jobs read the image of their stage from this file, so the version of a bump is the version the jobs run.
- The ls-lint and Renovate versions sit in `env` of their steps. A comment such as `# renovate: datasource=npm depName=@ls-lint/ls-lint` right above the line tells Renovate where to look, so keep the comment when you edit the line.

## File names

The `File names` job runs [ls-lint](https://ls-lint.org/) with the rules of `.ls-lint.yml` on every pull request. It reads the names of the files and folders and fails with the ones that break a rule, so a name is fixed before the merge and not renamed later.

- A folder is lowercase words joined by hyphens, and a leading dot marks the folder of a tool.
- Every other file is lowercase words joined by hyphens, with dots for the extension and for a variant such as `button.test.tsx`. This includes `.ts` and `.tsx` files, which are kebab case in the shadcn/ui convention. A Markdown file may also be in capitals such as `README.md`.
- A YAML file ends with `.yml`. The workflows end with `.yaml` and never `.yml`.
- A file with no extension, such as `Dockerfile` and `LICENSE`, has no rule.
- The folders `.git`, `node_modules`, `dist`, `coverage`, `playwright-report` and `test-results` are left out, and so is `.github/ISSUE_TEMPLATE` because GitHub names the issue forms by what the person sees.

Two names that differ only by case are not checked, because the tool does not do it. A new tool that needs a name of its own is added to the `ignore` list of `.ls-lint.yml`, with the reason in a comment.

## Pull request flow

A pull request must pass `Conventional commits` before it can be merged, and `PR format` before it can be merged, as [CONTRIBUTING.md](../CONTRIBUTING.md#pull-requests) describes. Merge commits are the only merge method. The checks run in CI, so contributors do not need to run heavy tasks on their own machine.

## Known gaps

`npm audit` reports 13 moderate advisories on 2026-10-31. All of them are one denial of service issue in `minimatch`, which sits inside ESLint 9 and typescript-eslint. These are development tools that are not part of the build, and CI never gives them a glob pattern from outside. ESLint 9 stays because eslint-plugin-jsx-a11y does not support ESLint 10 yet. Revisit this when it does.

The Actionlint and Zizmor jobs, and the image that the commit message action builds, pull images from Docker Hub and GitHub Container Registry without a login or a mirror, as the reference repository does with one. A rate limit on an anonymous pull fails the job for a reason that has nothing to do with the change, and the first response is to rerun the failed job once. A pull mirror is added when that happens more than once.
