# Frontend

Frontend of WATTLINK, an energy audit dashboard for small businesses (UMKM) in Indonesia, built for the UNS Innovation Hackathon 2026. The interface is in Indonesian. WATTLINK is the name of the app that users see. Aethera is the name of the organization and stays in the repository names, the API host and the settings.

## Status

The app has a shell with a menu (a bottom bar on a phone and a sidebar on a wide screen), the Rubik text styles, the Figma color tokens and the screens of the Mobile design. They are Beranda, Saran, Alat, Laporan, the Lainnya menu with Catat produksi and Pengaturan, the steps to add a device, and Masuk and Daftar, whose forms stay disabled until the login exists. The backend does not exist yet, so the screens read a contract that the frontend assumes (see `docs/api-assumptions.md`), and nothing in the app uses sample data. Until the API answers, the screens show their loading, error and empty states.

## Stack

What exists now:

- React 19 and TypeScript, built with Vite
- Tailwind CSS 4
- Vitest and Testing Library for unit tests
- Playwright with axe for end to end and accessibility tests on 14 devices
- ESLint and Prettier
- Lighthouse CI and size-limit for the scores and the size of the build
- Storybook for components, with the accessibility add-on (`npm run storybook`)
- Design tokens from the Figma file in `src/styles/tokens.css`, with Light and Dark themes
- npm, with exact versions in `package-lock.json`
- A Docker image (nginx, non-root), published signed to GitHub Container Registry and Docker Hub
- Release Please for the version and the changelog

What is planned and not built yet:

- Lazy loading of the routes
- The Desktop variants of the master-detail screens
- The other sign-in screens (email check, forgotten password, new password and business name after Google), which need the login

## Run it

```sh
npm ci
cp .env.example .env
npm run dev
```

The app needs Node.js 24 (24.15 or newer) or 26. [CONTRIBUTING.md](CONTRIBUTING.md) lists the checks that CI runs.

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

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. The checks and the rules of the `main` branch are described in [docs/ci-cd.md](docs/ci-cd.md). Report security problems privately as described in [SECURITY.md](SECURITY.md), and read [ACCESSIBILITY.md](ACCESSIBILITY.md) for what the design aims for. Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the GNU General Public License version 3. See [LICENSE](LICENSE).
