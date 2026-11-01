# Credits

The design system of this project draws on two public design systems. This page names them, links to their sources and says under which licenses they are published.

## Sentry, Scraps

Scraps is the design system that Sentry uses for its own product interface. Its components, themes and design tokens are a reference for the structure and the tokens of our design system.

- Source: [getsentry/sentry](https://github.com/getsentry/sentry), published on npm as [`@sentry/scraps`](https://www.npmjs.com/package/@sentry/scraps)
- Owner: Functional Software, Inc. dba Sentry
- License: Functional Source License 1.1 with an Apache 2.0 future license (FSL-1.1-Apache-2.0)

## Canva, Apps SDK UI kit

The UI kit of the Canva Apps SDK and its design guidelines are the second reference.

- Source: [`@canva/app-ui-kit`](https://www.npmjs.com/package/@canva/app-ui-kit) and the [Canva Apps SDK documentation](https://www.canva.dev/docs/apps/)
- Owner: Canva Pty Ltd
- License: the Canva license in the package, which allows the components only inside apps that run on the Canva platform

## What this repository contains

This repository does not ship code, components or assets from either package. Neither package is a dependency in `package.json`, and the interface is built with React, Tailwind CSS and Radix primitives. Both licenses restrict how the components may be reused, so the packages are a reference and not a library of ours.

The names Sentry, Scraps and Canva belong to their owners. Their mention here does not mean that the owners endorse this project.
