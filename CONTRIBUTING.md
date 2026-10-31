# Contributing

Thanks for helping with the frontend of the energy audit dashboard. This guide keeps changes easy to review.

Everyone who takes part in this project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Set up

The app needs Node.js 24 (the version is in `.node-version`) and npm. Install the packages with `npm ci`, copy `.env.example` to `.env` and start the dev server with `npm run dev`. The `VITE_` settings are public values that end up in the build. An empty `VITE_GOOGLE_CLIENT_ID` means Google sign-in is not configured.

`.npmrc` saves exact versions and does not run the install scripts of dependencies. The npm scripts you run are listed in `package.json`. The checks that CI runs are `typecheck`, `lint`, `format:check`, `test:coverage`, `build` and `test:e2e`. The end to end tests need the Playwright browsers, which `npx playwright install` downloads once. Run `npm run format` to fix the formatting of your changes.

## Making a change

1. Branch from `main`. Name the branch `type/short-description`, for example `fix/saran-filter`, using the same type as your commits.
2. Keep one pull request to one concern. Unrelated changes go into separate branches and pull requests.
3. Write commits in the [Conventional Commits](https://www.conventionalcommits.org/) style, as `type(scope): summary`. The summary is the whole message, so do not add a body. The types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` and `revert`. A pull request cannot be merged while a commit message or its title does not follow this, because the required check "Conventional commits" fails. Fix the message with `git commit --amend` for the last commit, or an interactive rebase for an older one, and push again.
4. Write code, comments, commit messages and documentation in English. The text that people see in the interface is Indonesian. Match the style of the code around your change.
5. Add tests with every behavior change. A bug fix should come with a test that fails without the fix. Unit tests use Vitest and Testing Library, and they never need a backend or sample data in the app itself.

The ruleset of `main` requires every commit of a pull request to have a verified signature. The rule applies at merge time, so unsigned commits push to a branch without an error and the pull request is blocked when it is merged. Sign your commits with a GPG key, with an SSH key that you added to your GitHub account as a signing key, or with an S/MIME certificate from a trusted authority. The email address of the commit has to be a verified email address of your account for a GPG or S/MIME signature. GitHub explains the setup in [About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification). To sign commits that are already made, run `git rebase --exec 'git commit --amend --no-edit -n -S' origin/main` and force push your own branch. The squash and rebase buttons are off, because they would replace your signatures, so the commits keep the signatures that they have. Commits made in the web editor of GitHub and the merge commit of the Update branch button are signed by GitHub.

## Checks run in CI

Every check runs in CI on your pull request, so you should not need to run heavy tasks such as full builds, test suites or end to end runs on your own machine. Push your branch, open the pull request and read the results of the checks. Run something locally only when the CI logs cannot explain a failure, and keep it small.

## Names

Names are checked in the pull request, so it is quicker to follow them from the start. Folders are lowercase words joined by hyphens, and a leading dot marks the folder of a tool. Files are lowercase words joined by hyphens, which includes `.ts` and `.tsx` files such as `energy-chart.tsx`, and a dot may mark a variant such as `button.test.tsx`. Markdown files may also use capitals, such as `README.md`. YAML files end with `.yml`, except the workflows, which end with `.yaml`. The rules and the few files that are allowed to break them are in [docs/ci-cd.md](docs/ci-cd.md#file-names).

## Pull requests

- The title is a Conventional Commit, such as `fix(saran): keep the filter after a reload`. The "Conventional commits" check blocks the merge when the title or any commit does not follow it.
- The body is only the list of commits in the pull request, one hyphen bullet per commit. The check accepts lines that start with a hyphen and text, so other bullet marks and indented sub bullets fail.
- Name the branch `type/short-description`, with the type of the commits, such as `fix/saran-filter`.
- Add one label, `bug` for fixes, `enhancement` for features and `documentation` for documentation only, and assign the pull request to yourself.
- The "PR format" check blocks the merge when the branch name, the label, the assignee or the body does not follow this. Add what is missing and then either rerun the failed check from the checks tab or edit the body, because adding a label or an assignee does not start the check again.
- Pull requests are merged with a merge commit, never squashed or rebased.
- Every required check must pass. They are listed in the repository rules and described in [docs/ci-cd.md](docs/ci-cd.md).
- Read the bot comments on your pull request and resolve every review thread.

## Reporting problems

Use the issue templates for bugs and feature requests. Report security problems privately as described in [SECURITY.md](SECURITY.md).
