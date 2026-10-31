# 0001 Cloudflare Pages hosts the app and a Docker image is the second way to run it

Status: Accepted

## Context

The app is static files after the build. It has no server code and no secrets, so it can be hosted by any web server. A hackathon team needs a preview of every pull request, a fast deploy of `main` and a low cost. The same files may also have to run on the server of the team next to the API, for example when a demo must not depend on a third party.

## Decision

Cloudflare Pages is the host. It builds `main` for production and every other branch for a preview address, and it reads `public/_headers` for the security headers. A Docker image with nginx is the second way to run the same build. It exists so that the team can run the app anywhere that runs containers, and it is built, scanned, signed and published by CI. There is no staging environment of its own, because the preview address of a pull request does that job.

## Consequences

- Every pull request has a preview address, and production follows `main` without a deploy step of ours.
- The security headers live in two places, `public/_headers` for Pages and `nginx/security-headers.conf` for the image. A unit test fails when the two differ.
- The two hosts differ in small ways, and the Docker section of [ci-cd.md](../ci-cd.md) lists them.
- A change of host later means moving the headers and the fallback to `index.html` for unknown paths, and nothing in the app code.
