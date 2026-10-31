# CI/CD

## Workflows

| Workflow | Trigger | What it does |
|:---|:---|:---|
| `commits.yaml` | pull requests | Lints the commits of the pull request with commitlint and its Conventional Commits rules, which are set in `commitlint.config.mjs`, and checks the pull request title against the same types. It never cancels a run, skips an edit that changes neither the title nor the base branch, and reads the title from the pull request when it runs, so editing the body of a pull request cannot leave a cancelled required check behind and a rerun checks the current title. Merge commits are skipped, and the line lengths of the body and footer are not limited because Renovate writes long ones |
| `prformat.yaml` | pull requests | Checks that the branch is named `type/short-description` with a type of Conventional Commits, that the pull request has a label and an assignee, and that the body is only hyphen bullets with text. A pull request that a bot opened (Renovate, Dependabot or Release Please) from its own branch is skipped. It never cancels a run and reads the pull request when it runs, so a label or an assignee that was added later is picked up by a rerun of the failed run or by an edit of the body. Adding a label or an assignee starts no run, and the newest run of the check is the one that counts |
| `config.yaml` | push to main, pull requests, manual | Lints the configuration of the repository with the eight jobs below |
| `ci.yaml` | push to main, pull requests, manual | Checks the app with five jobs that run in parallel and install with `npm ci`. Every job uses the Node.js version of `.node-version` |
| `docker.yaml` | push to main, pull requests, manual | Builds the image of the app for the platform of the runner, starts it, checks the behavior of its web server and scans it with Trivy. It publishes nothing yet. A run is cancelled when a newer one starts for the same ref |
| `e2e-devices.yaml` | every Monday 03:00 UTC, manual | Runs the end to end tests on every device that Playwright knows, about 200 phones, tablets and desktop browsers. It is too slow for pull requests. A failure here is not a required check, read the report artifact and fix it in a normal pull request |
| `security.yaml` | push to main, pull requests, every day at 20:00 UTC, manual | Scans the code, the dependencies, the history and the repository files with the five jobs below. The daily run catches problems that are disclosed later in code that did not change |

### Jobs

| Workflow | Job | What it checks |
|:---|:---|:---|
| `commits.yaml` | Conventional commits | The commit messages with commitlint and the pull request title with a pattern for the same types |
| `prformat.yaml` | PR format | The branch name, the label, the assignee and the body of the pull request |
| `config.yaml` | Actionlint | The syntax and the expressions of every workflow, with actionlint |
| `config.yaml` | Zizmor | The workflows for security problems, such as unpinned actions, broad permissions and injection through expressions, with zizmor |
| `config.yaml` | File names | The names of the files and folders against `.ls-lint.yml`, with ls-lint |
| `config.yaml` | Renovate config | `renovate.json` with the Renovate validator in strict mode |
| `config.yaml` | Hadolint | The `Dockerfile` of the app against the Dockerfile rules and the shell rules of its `RUN` steps, with Hadolint |
| `config.yaml` | Dotenv lint | `.env.example` for duplicate keys, wrong spacing and other format problems, with dotenv-linter. The check for the order of the keys is off, because the file lists the settings in the order of the code that reads them |
| `config.yaml` | Compose config | `docker compose config` on `compose.yml` with a copy of `.env.example` as `.env`. It builds nothing and starts nothing |
| `config.yaml` | ShellCheck | Every shell script that git tracks, with the settings of `.shellcheckrc` |
| `ci.yaml` | Typecheck | `tsc -b` over the app and the Vite config |
| `ci.yaml` | Lint | ESLint with the strict type checked rules of typescript-eslint, the React hooks rules and the accessibility rules of jsx-a11y, then the Prettier check |
| `ci.yaml` | Unit tests | The Vitest tests with coverage. The job fails when the total statement, branch, function or line coverage drops under the floor of `vite.config.ts`, and it uploads `coverage/lcov.info` to Codecov |
| `ci.yaml` | Build | `npm run build`, which typechecks and builds the app with Vite |
| `ci.yaml` | E2E | Builds the app, serves it with `vite preview` and runs the Playwright tests on 14 devices in Chromium, Firefox and WebKit. The tests check that the page loads, that an unknown path still loads the app, that the console has no errors, that the page does not scroll sideways and that axe finds no WCAG 2.2 AA or best practice violations. The HTML report is uploaded as an artifact |
| `docker.yaml` | Docker build | Builds the image with the public placeholder `VITE_API_BASE_URL=https://api.example.com`, runs it read only with no capabilities, and checks 200 on `/`, `/healthz` and an unknown path, 404 on a missing asset and on `/_headers`, the cache headers (a 404 is not immutable), the five security headers on six paths and that the process is not root. Then Trivy scans the image and fails on a fixed CRITICAL or HIGH vulnerability |
| `security.yaml` | CodeQL | Static analysis of the JavaScript and TypeScript source with CodeQL, reported to code scanning |
| `security.yaml` | npm audit | `npm audit` fails on a high or critical advisory in any package, tools included. `npm audit signatures` checks the registry signature of every installed package and the provenance attestations of the packages that provide them |
| `security.yaml` | Secret scan (gitleaks) | Runs the gitleaks CLI over the whole history and reports to code scanning. The CLI runs directly because the gitleaks action needs a license for some accounts |
| `security.yaml` | Trivy filesystem scan | Trivy over the lockfile, the Dockerfile and the repository files for vulnerabilities, secrets and misconfiguration. It fails on a fixed critical or high finding and reports to code scanning |
| `security.yaml` | OSSF Scorecard | Runs on `main` and on the schedule only, because Scorecard rejects pull requests. It reports to code scanning and is never required |

## Required checks

The ruleset of `main` requires a pull request that is merged with a merge commit, resolved review threads, branches that are up to date with `main` (strict checks), and it refuses deletion and force pushes. Signed commits are not required yet.

Every check below is required. All of them are reported by GitHub Actions except `codecov/patch`, which Codecov reports a few minutes after the tests finish, so a merge has to wait for it.

| Check | Reported by | Required |
|:---|:---|:---|
| Conventional commits | GitHub Actions | yes |
| PR format | GitHub Actions | yes |
| Actionlint | GitHub Actions | yes |
| Zizmor | GitHub Actions | yes |
| File names | GitHub Actions | yes |
| Renovate config | GitHub Actions | yes |
| Typecheck | GitHub Actions | yes |
| Lint | GitHub Actions | yes |
| Unit tests | GitHub Actions | yes |
| Build | GitHub Actions | yes |
| E2E | GitHub Actions | yes |
| Docker build | GitHub Actions | yes |
| CodeQL | GitHub Actions | yes |
| npm audit | GitHub Actions | yes |
| Secret scan (gitleaks) | GitHub Actions | yes |
| Trivy filesystem scan | GitHub Actions | yes |
| codecov/patch | Codecov | yes |

Each check was added to the ruleset after it had reported once on a pull request, because GitHub only offers a check that it has seen. Every check is pinned to the app that reports it, so another app cannot post a check with the same name. Add a new check to the ruleset in the same change that introduces it, and update this page in that change too.

## Docker image

The `Dockerfile` builds the app in a Node stage and serves the files with `nginxinc/nginx-unprivileged` on port 8080, as user 101. Both base images are pinned by digest and Renovate keeps them current with the commit type `build`. The tools of `.github/tools/Dockerfile` keep the commit type `ci`.

- The `VITE_` settings are build arguments. They end up in the files, so one image is built for one environment and has no settings at run time.
- `nginx/security-headers.conf` has the same security headers as the `/*` block of `public/_headers`, which Cloudflare Pages reads. A unit test (`nginx/security-headers.test.ts`) fails when the two files differ.
- The web server differs from Pages in two small ways. A missing file under `/assets/` is a 404 and not the app, and that 404 is never cached as immutable, because an HTML page under the address of a script would be cached for a year. The file `/_headers` is a 404, as on Pages. A bare directory name such as `/assets` gets a relative redirect, where Pages serves the app.
- `compose.yml` runs the image on `http://localhost:3000` to look at the production build. Its content security policy only allows the hosts of Aethera, so use `npm run dev` for work against another API.
- The image is built and scanned on every pull request but it is not published yet. The push to GitHub Container Registry, the signature and the Docker Hub mirror come in later changes.
- The upgrade step of the final stage takes the newest Alpine fixes, and the build argument `PACKAGES_DATE` changes every day so that BuildKit does not reuse an old layer of that step from the cache.
- BuildKit asks `mirror.gcr.io` before Docker Hub for the base images, because Docker Hub limits anonymous pulls per IP address and the runners share theirs.

## End to end tests

The tests are in `e2e/` and run against the production build served by `vite preview`, so they see the same files as the site. The devices of a pull request are listed in `playwright.config.ts`. They are an iPhone SE (the smallest screen at 320 px), an iPhone 13 (the 390 px of the design), an iPhone 17 Pro Max, a Galaxy S8, a Galaxy S24, a Pixel 7, the cover screen of a Galaxy Z Fold 7, an iPad Mini, an iPad Pro 11 in both orientations and four desktop browsers (Chrome, Chrome HiDPI, Firefox and Safari). Playwright picks Chromium, Firefox or WebKit for each device. The weekly workflow `e2e-devices.yaml` sets `ALL_DEVICES=1` and runs the whole list of Playwright. The Desktop Edge entry is Chromium with the user agent of Edge, so it does not test the real Edge browser.

`npm ci` does not download the browsers because `.npmrc` skips install scripts. Run `npx playwright install` once to get them, and then `npm run test:e2e`. Run the tests locally only when the CI logs cannot explain a failure, and add `--project "iPhone 13"` to keep it small.

Accessibility has two layers. ESLint with jsx-a11y checks the code and axe checks the rendered page on every device. Neither one is a test with assistive technology such as a screen reader, which [ACCESSIBILITY.md](../ACCESSIBILITY.md) lists as a gap.

## Coverage

The `Unit tests` job uploads `coverage/lcov.info` to Codecov, which comments on pull requests that change the coverage. The thresholds are in `codecov.yml`.

- `codecov/patch` is required. It compares the coverage of the changed lines with the base and tolerates a drop of 5 percentage points, so it catches code that is added without tests, but it does not demand that every changed line is covered.
- `codecov/project` is set up in `codecov.yml` with a tolerance of 1 percentage point, but it is not required. It needs a base report from `main`, which does not exist before the first upload.
- The `Unit tests` job has a coverage floor of 70 percent in `vite.config.ts`. Raise the floor when the coverage has grown and never lower it to let a change in.
- A failed upload fails the job on `main` only. On a pull request it fails nothing in the job, but `codecov/patch` then never arrives and blocks the merge until the upload works again or the check is taken out of the ruleset.

## Pulling images

Docker Hub limits anonymous pulls per IP address, and every GitHub runner shares its addresses with many other people, so a job that pulls from Docker Hub can fail with `toomanyrequests` or a timeout for a reason that has nothing to do with the change. The jobs avoid it in two ways.

- The jobs that run a Docker Hub image call the local action `.github/actions/pull-images` right after the checkout. It adds `mirror.gcr.io` to `registry-mirrors` of the Docker daemon, which serves the popular Docker Hub images without the limit, and it logs in to Docker Hub with a read-only token so that an image the mirror does not have is pulled by a known account. A login that fails does not fail the job.
- `.github/actions/pull-images/pull.sh` pulls an image from `mirror.gcr.io/` plus its name first and from Docker Hub when the mirror fails. The digests are the same, so the mirror serves the identical image.
- The Docker workflow gives BuildKit the same mirror in its config, because BuildKit does not read the settings of the Docker daemon.
- Images from `ghcr.io`, such as zizmor, are not limited this way and are pulled as they are.

To set up the login, create a read-only access token in the Docker Hub account settings and add it as the secret `DOCKERHUB_PULL_TOKEN`. The account name comes from the variable `DOCKERHUB_USERNAME`. A pull request from a fork gets neither, so its jobs pull without a login.

## Security

`security.yaml` has the jobs of the table above. The results of CodeQL, gitleaks and Trivy are uploaded to code scanning, so they show up in the security tab of the repository. A pull request from a fork cannot upload, so its jobs skip that step. The gitleaks and Trivy steps still fail on a finding. The CodeQL job passes whatever it finds, because the code scanning rule of the ruleset is what gates it, and a fork cannot upload results for that rule to read. The jobs that read a secret, `DOCKERHUB_PULL_TOKEN`, only use it for the image pulls.

## Ignore lists

- `.github/zizmor.yml` tells zizmor to accept the `./` form of a local action in `config.yaml` and `security.yaml`. zizmor prefers the `$/` syntax, and actionlint does not know it yet and rejects it.
- `.trivyignore.yaml` accepts the missing `USER` line (DS-0002) of `.github/tools/Dockerfile` and nothing else. That file only names the images of the lint jobs, and nothing builds or runs it. The Dockerfile of the app is still checked.

## Dependency updates

Renovate opens the update pull requests when its GitHub App runs on the repository, and `renovate.json` holds its rules. It runs on Mondays before 07:00 WIB, proposes a release only after it is 7 days old, and groups minor and patch updates of Actions (`actions`) and of npm packages (`npm-minor-patch`). A major update gets its own pull request. The commit type is `ci` for Actions and the tools of the workflows, and `build` for npm packages, so neither is a `feat` or a `fix`. The bot keeps an issue called Dependency Dashboard with every update it knows about. Security fixes ignore the schedule and the 7 day wait. Renovate learns about them from the Dependabot alerts of the repository, so those alerts need to stay on.

## Pinned tools

The bot cannot read a tool that is named inside a `run` step, so the tools of the jobs are listed where it can.

- `.github/tools/Dockerfile` has one stage for each image that a job starts with `docker run`, which are actionlint, zizmor and gitleaks. Nothing builds it. The jobs ask `.github/tools/image.sh` for the image of a stage, so the version of a bump is the version the jobs run.
- The ls-lint and Renovate versions sit in `env` of their steps. A comment such as `# renovate: datasource=npm depName=@ls-lint/ls-lint` right above the line tells Renovate where to look, so keep the comment when you edit the line.

## File names

The `File names` job runs [ls-lint](https://ls-lint.org/) with the rules of `.ls-lint.yml` on every pull request. It reads the names of the files and folders and fails with the ones that break a rule, so a name is fixed before the merge and not renamed later.

- A folder is lowercase words joined by hyphens, and a leading dot marks the folder of a tool.
- Every other file is lowercase words joined by hyphens, with dots for the extension and for a variant such as `button.test.tsx`. This includes `.ts` and `.tsx` files, which are kebab case in the shadcn/ui convention. A Markdown file may also be in capitals such as `README.md`.
- A YAML file ends with `.yml`. The workflows end with `.yaml` and never `.yml`.
- A file with no extension, such as `Dockerfile` and `LICENSE`, has no rule.
- `.trivyignore.yaml` keeps the name that Trivy reads, so it is in the `ignore` list of `.ls-lint.yml`.
- The folders `.git`, `node_modules`, `dist`, `coverage`, `playwright-report` and `test-results` are left out, and so is `.github/ISSUE_TEMPLATE` because GitHub names the issue forms by what the person sees.

Two names that differ only by case are not checked, because the tool does not do it. A new tool that needs a name of its own is added to the `ignore` list of `.ls-lint.yml`, with the reason in a comment.

## Pull request flow

A pull request must pass `Conventional commits` before it can be merged, and `PR format` before it can be merged, as [CONTRIBUTING.md](../CONTRIBUTING.md#pull-requests) describes. Merge commits are the only merge method. The checks run in CI, so contributors do not need to run heavy tasks on their own machine.

## Known gaps

`npm audit` reports 13 moderate advisories on 2026-10-31. All of them are one denial of service issue in `minimatch`, which sits inside ESLint 9 and typescript-eslint. These are development tools that are not part of the build, and CI never gives them a glob pattern from outside. ESLint 9 stays because eslint-plugin-jsx-a11y does not support ESLint 10 yet. Revisit this when it does.

The image that the commit message action builds pulls its base image from Docker Hub without a login or a mirror, because the action builds it itself. A rate limit on that pull fails the job for a reason that has nothing to do with the change, and the first response is to rerun the failed job once.
