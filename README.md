# Frontend

Frontend of an energy audit dashboard for small businesses (UMKM) in Indonesia, built for the UNS Innovation Hackathon 2026. The interface is in Indonesian.

## Status

The app has a shell with a menu (a bottom bar on a phone and a sidebar on a wide screen), the Rubik text styles, the Figma color tokens and a not found page. The screens come from the Figma design in later pull requests, and the backend does not exist yet, so nothing in the app uses sample data.

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

- shadcn/ui components
- The Rubik font and the text styles of the Figma file
- React Router, TanStack Query and Recharts

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

## Design

The design lives in Figma. The colors, the radii, the spacing and the button lift of the file are CSS variables in `src/styles/tokens.css`, and every variable has the name that the Figma variable carries as its web code syntax. The Light theme is the default. The Dark theme applies with `data-theme="dark"` on the page, or when the system prefers dark and the page has not chosen `data-theme="light"`. Tailwind names the colors after the variables, so `--bg-1` gives `bg-bg-1`, and the radii give `rounded-sm` to `rounded-xl`. The design has a Mobile version at 390 px wide and a Desktop version at 1280 px wide, each in a Light and a Dark theme. The Figma file is not linked from this repository yet.

## Decisions

The reasons behind the larger choices are in [docs/adr](docs/adr). Each file is one decision with its context and its consequences.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. The checks and the rules of the `main` branch are described in [docs/ci-cd.md](docs/ci-cd.md). Report security problems privately as described in [SECURITY.md](SECURITY.md), and read [ACCESSIBILITY.md](ACCESSIBILITY.md) for what the design aims for. Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the GNU General Public License version 3. See [LICENSE](LICENSE).
