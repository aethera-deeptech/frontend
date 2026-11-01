# Credits

The design system of this project draws on two public design systems. This page names them, links to their sources and says under which licenses they are published.

## Sentry, Scraps

Scraps is the design system that Sentry uses for its own product interface. Its components, themes and design tokens are a reference for the structure and the tokens of our design system.

- Source: [static/packages/scraps in getsentry/sentry](https://github.com/getsentry/sentry/tree/master/static/packages/scraps), published on npm as `@sentry/scraps`
- Owner: Functional Software, Inc. dba Sentry
- License: Functional Source License 1.1 with an Apache 2.0 future license (FSL-1.1-Apache-2.0), see the [license text](https://github.com/getsentry/sentry/blob/master/static/packages/scraps/LICENSE.md). It allows any use that is not a competing use.

## Canva, Apps SDK UI kit

The UI kit of the Canva Apps SDK and its design guidelines are the second reference.

- Source: the npm package `@canva/app-ui-kit` and the [Canva Apps SDK documentation](https://www.canva.dev/docs/apps/)
- Owner: Canva Pty Ltd
- License: the Canva license in the package. It allows the components only for building apps that are offered solely on the Canva platform, and it asks for a copy of the license in every copy or derivative.

## What this repository contains

This repository does not ship code, components or assets from either package. Neither package is a dependency in `package.json`, and the interface is built with React, Tailwind CSS and Radix primitives. The Canva license limits its components to apps on the Canva platform, and the Sentry license excludes competing use and was written for the Sentry product. The packages are a reference and not a library of ours. If a value of either system is ever copied into this repository, it is credited here in the same change.

The names Sentry, Scraps and Canva belong to their owners. Their mention here does not mean that the owners endorse this project.
