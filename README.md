# Frontend

Frontend of an energy audit dashboard for small businesses (UMKM) in Indonesia, built for the UNS Innovation Hackathon 2026. The interface is in Indonesian.

## Status

The app is a bare scaffold. It builds and has tests, but it shows only the product name. The screens come from the Figma design in later pull requests, and the backend does not exist yet, so nothing in the app uses sample data.

## Stack

What exists now:

- React 19 and TypeScript, built with Vite
- Tailwind CSS 4
- Vitest and Testing Library for unit tests
- Playwright with axe for end to end and accessibility tests on 14 devices
- ESLint and Prettier
- npm, with exact versions in `package-lock.json`

What is planned and not built yet:

- shadcn/ui components and Tailwind driven by the Figma tokens
- React Router, TanStack Query and Recharts
- Lighthouse CI and Storybook
- A Docker image, built in CI

## Run it

```sh
npm ci
cp .env.example .env
npm run dev
```

The app needs Node.js 24 (24.15 or newer) or 26. [CONTRIBUTING.md](CONTRIBUTING.md) lists the checks that CI runs.

## Hosting

The site is static files. Cloudflare Pages builds `main` with `npm run build` and serves `dist`. The repository has no `404.html`, so Pages serves `index.html` for every unknown path, which is what a single page app needs. `public/_headers` sets the security headers and the content security policy. The API address is a build setting (`VITE_API_BASE_URL`), so a change needs a new build.

## Design

The design lives in Figma. It has a Mobile version at 390 px wide and a Desktop version at 1280 px wide, each in a Light and a Dark theme. The Figma file is not linked from this repository yet.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. The checks and the rules of the `main` branch are described in [docs/ci-cd.md](docs/ci-cd.md). Report security problems privately as described in [SECURITY.md](SECURITY.md), and read [ACCESSIBILITY.md](ACCESSIBILITY.md) for what the design aims for. Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the GNU General Public License version 3. See [LICENSE](LICENSE).
