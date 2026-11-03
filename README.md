# Frontend

[![CI](https://github.com/aethera-deeptech/frontend/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/ci.yaml)
[![Security](https://github.com/aethera-deeptech/frontend/actions/workflows/security.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/security.yaml)
[![Docker](https://github.com/aethera-deeptech/frontend/actions/workflows/docker.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/docker.yaml)
[![Docker Hub mirror](https://github.com/aethera-deeptech/frontend/actions/workflows/docker-hub-mirror.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/docker-hub-mirror.yaml)
[![Config lint](https://github.com/aethera-deeptech/frontend/actions/workflows/config.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/config.yaml)
[![Performance](https://github.com/aethera-deeptech/frontend/actions/workflows/performance.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/performance.yaml)
[![Vale](https://github.com/aethera-deeptech/frontend/actions/workflows/vale.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/vale.yaml)
[![Links](https://github.com/aethera-deeptech/frontend/actions/workflows/links.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/links.yaml)
[![E2E all devices](https://github.com/aethera-deeptech/frontend/actions/workflows/e2e-devices.yaml/badge.svg?branch=main)](https://github.com/aethera-deeptech/frontend/actions/workflows/e2e-devices.yaml)

[![Release](https://img.shields.io/github/v/release/aethera-deeptech/frontend?sort=semver)](https://github.com/aethera-deeptech/frontend/releases)
[![License](https://img.shields.io/github/license/aethera-deeptech/frontend)](LICENSE)
[![React](https://img.shields.io/github/package-json/dependency-version/aethera-deeptech/frontend/react?label=react)](package.json)
[![TypeScript](https://img.shields.io/github/package-json/dependency-version/aethera-deeptech/frontend/dev/typescript?label=typescript)](package.json)
[![Vite](https://img.shields.io/github/package-json/dependency-version/aethera-deeptech/frontend/dev/vite?label=vite)](package.json)

[![Site](https://img.shields.io/website?url=https%3A%2F%2Faethera.syafahadyan.com&label=site)](https://aethera.syafahadyan.com)
[![Docker pulls](https://img.shields.io/docker/pulls/syafa/aethera-frontend)](https://hub.docker.com/r/syafa/aethera-frontend)
[![Docker image size](https://img.shields.io/docker/image-size/syafa/aethera-frontend/latest)](https://hub.docker.com/r/syafa/aethera-frontend)

[![Last commit](https://img.shields.io/github/last-commit/aethera-deeptech/frontend)](https://github.com/aethera-deeptech/frontend/commits/main)
[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-FE5196)](https://www.conventionalcommits.org)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen?logo=renovatebot)](https://docs.renovatebot.com/)

[![codecov](https://codecov.io/gh/aethera-deeptech/frontend/graph/badge.svg?token=XJ7XEAUB9V)](https://codecov.io/gh/aethera-deeptech/frontend)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/aethera-deeptech/frontend/badge)](https://scorecard.dev/viewer/?uri=github.com/aethera-deeptech/frontend)

Frontend of WATTLINK, an energy audit dashboard for small businesses (UMKM) in Indonesia, built for the UNS Innovation Hackathon 2026. The interface is in Indonesian. WATTLINK is the name of the app that users see. Aethera is the name of the organization and stays in the repository names, the API host and the settings.

## Status

The app has a shell with a menu (a bottom bar on a phone and a sidebar on a wide screen), the Rubik text styles, the Figma color tokens and every screen of the Mobile design, with a Desktop layout for the wide screen. They are Beranda, Saran, Alat, Laporan with the monthly and the weekly report, the Lainnya menu with Catat produksi and Pengaturan, the steps to add a WATTLINK Hub and a device, and Masuk, Daftar, the verification of the email, the change of the email and the reset of a forgotten password. Every other screen needs a session, so a visitor without one is sent to Masuk and back to the screen after the sign in, and Keluar ends the session. The Google buttons stay disabled until a client id is set and the Google sign in is built. The screens call the API of the backend, and `docs/api-assumptions.md` lists every call and the answers that the screens react to. Nothing in the app uses sample data, so until the API answers, the screens show their loading, error and empty states.

## Stack

What exists now:

- React 19 and TypeScript, built with Vite
- React Router with a lazy chunk for each page
- TanStack Query for the API calls, with zod to check every answer
- Tailwind CSS 4 and Radix for the menus
- Sentry for errors, loaded as its own chunk
- Vitest and Testing Library for unit tests
- Playwright with axe for end to end and accessibility tests on 14 devices
- ESLint and Prettier
- Lighthouse CI and size-limit for the scores and the size of the build
- Storybook for components, with the accessibility add-on (`npm run storybook`)
- Design tokens from the Figma file in `src/styles/tokens.css`, with Light and Dark themes
- npm, with exact versions in `package-lock.json`
- A Docker image (nginx, non-root), published signed to GitHub Container Registry and Docker Hub
- cspell, Vale and ls-lint for the spelling, the prose and the file names
- Release Please for the version and the changelog

What is planned and not built yet:

- Google sign in, which waits for the route of the backend

## Run it

```sh
npm ci
cp .env.example .env
npm run dev
```

The app needs Node.js 26, and 24.15 or newer also works. [CONTRIBUTING.md](CONTRIBUTING.md) lists the checks that CI runs.

## Configuration

Every setting is a `VITE_` build variable, so it ends up in the files and a change needs a new build. A `.env` file is read when present, and `.env.example` shows the full list. The build stops with a message when `VITE_API_BASE_URL` is not a full URL.

| Variable                  | Default        | Purpose                                                                                                            |
| :------------------------ | :------------- | :----------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`       | none, required | Address of the API, without a path. The example file uses `http://localhost:8080`.                                 |
| `VITE_GOOGLE_CLIENT_ID`   | empty          | Client id for Google sign in. Empty keeps the Google buttons disabled.                                             |
| `VITE_SENTRY_DSN`         | empty          | Address that receives the errors. Empty means that no error is sent and that the Sentry chunk is never downloaded. |
| `VITE_SENTRY_ENVIRONMENT` | `production`   | Name that Sentry files the errors under, for example `preview`.                                                    |

## Docker

```sh
docker compose up --build
```

This builds the image and serves it on http://localhost:3000. The published image is `ghcr.io/aethera-deeptech/frontend` and `syafa/aethera-frontend` on Docker Hub, and [docs/ci-cd.md](docs/ci-cd.md) shows how to verify its signature. This compose setup is for looking at the production build, and `npm run dev` is for work against another API, because the content security policy of the image only allows the hosts of Aethera.

## Hosting

The site is static files. Cloudflare Pages builds `main` with `npm run build` and serves `dist`. The repository has no `404.html`, so Pages serves `index.html` for every unknown path, which is what a single page app needs. `public/_headers` sets the security headers and the content security policy. The API address is a build setting (`VITE_API_BASE_URL`), so a change needs a new build.

## Error reporting

Errors reach Sentry when the build has a `VITE_SENTRY_DSN`. The SDK loads as its own chunk after the entry, so a build with no DSN never downloads it, and an uncaught error that happens before the chunk has loaded is not reported. A route error that the error page catches in that time is queued and sent once the chunk has loaded. Nothing is sent when the chunk fails to load. `VITE_SENTRY_ENVIRONMENT` names the environment, for example `production` or `preview`, so the errors of a preview stay apart from production. The SDK is started with `dataCollection` turned off for the user info (so no IP address), the cookies, the headers, the bodies and the query string, and without its session reports, and the app sets up no tracing and no replay. The page address, the browser and the console and click breadcrumbs still go with an error. A page that throws shows the error page and reports the error. The content security policy allows only the EU ingest hosts of Sentry, `*.ingest.de.sentry.io`, so a DSN in another region needs a change of the policy. The published image is built without a DSN, so only the Cloudflare Pages builds report.

## Design

The design lives in Figma. The colors, the radii, the spacing and the button lift of the file are CSS variables in `src/styles/tokens.css`, and every variable has the name that the Figma variable carries as its web code syntax. The Light theme is the default. The Dark theme applies with `data-theme="dark"` on the page, or when the system prefers dark and the page has not chosen `data-theme="light"`. Tailwind names the colors after the variables, so `--bg-1` gives `bg-bg-1`, and the radii give `rounded-sm` to `rounded-xl`. The design has a Mobile version at 390 px wide and a Desktop version at 1280 px wide, each in a Light and a Dark theme. The Figma file is not linked from this repository yet.

The design system draws on Sentry's Scraps and the Canva Apps SDK UI kit, and [docs/credits.md](docs/credits.md) credits both with their licenses.

## Decisions

The reasons behind the larger choices are in [docs/adr](docs/adr). Each file is one decision with its context and its consequences.

## Documentation

- [API assumptions](docs/api-assumptions.md) lists every call that the screens make and the answers that they react to.
- [CI/CD](docs/ci-cd.md) covers the workflows, the required checks, the rules of the `main` branch and how releases are made.
- [Decision records](docs/adr) explain why the site is on Cloudflare Pages and in an image, why the settings are fixed at build time, why only signed merge commits are used, why only the release App creates tags, why the image is signed before it is tagged and why the tool versions are pinned.
- [Credits](docs/credits.md) credits the design kits that the design system draws on.
- [ACCESSIBILITY.md](ACCESSIBILITY.md) says what the design aims for.

## Project layout

```
src/api/                 one file for each part of the API, with the zod schemas of the answers
src/pages/<screen>/      the pages, their views and their tests
src/components/          ui, layout, charts and icons
src/hooks/ and src/lib/  hooks and helpers such as the formats, the dates and the settings loader
src/styles/              the Figma tokens (tokens.css), next to index.css for the text styles
e2e/                     Playwright tests with axe
nginx/                   the server configuration and the security headers of the image
design/                  tests of the design tokens and the text styles
.storybook/              the Storybook setup
.github/                 workflows, templates, the Vale rules and the pinned tool versions
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. The checks and the rules of the `main` branch are described in [docs/ci-cd.md](docs/ci-cd.md). Report security problems privately as described in [SECURITY.md](SECURITY.md), and read [ACCESSIBILITY.md](ACCESSIBILITY.md) for what the design aims for. Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the GNU General Public License version 3. See [LICENSE](LICENSE).
