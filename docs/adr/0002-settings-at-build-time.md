# 0002 Settings are fixed at build time

Status: Accepted

## Context

The app runs in the browser, so every setting that it reads is public. Vite replaces a `VITE_` variable with its value while it builds. The API address, the Google client id and the Sentry address are public values and differ between production and a preview.

## Decision

The settings are build arguments and environment variables of the build. `src/lib/env.ts` reads them once on the first call of `getEnv` and checks them with Zod, so a missing or malformed address fails there and not later inside a request. The app does not call `getEnv` yet, and the first screen that needs a setting is the place to call it at start. One build is made for one environment, and the image has no settings at run time. The published image is built for production, and a build for another environment sets its own arguments. A secret never gets a `VITE_` name, because it would end up in the files.

## Consequences

- The Cloudflare Pages project holds one set of variables for production and one for previews, and a change needs a new build.
- The published image cannot be pointed at another API without a rebuild.
- The content security policy names the API hosts, so a new host needs a change of the policy as well.
- A Docker image for staging has to be built by whoever needs it.
