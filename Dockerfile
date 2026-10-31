# syntax=docker/dockerfile:1

# The build stage runs on the machine that builds the image, so the build of an arm64 image needs no emulation. The result is
# plain files. The last stage runs on the target platform, so its RUN step needs QEMU when the target is not the machine.
FROM --platform=$BUILDPLATFORM node:24-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build

WORKDIR /src

# The packages are installed first, so this layer is reused until the lockfile changes. .npmrc keeps the install scripts off.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# These are public values that end up in the files, so one image is built for one environment and has no settings at run time.
# The typecheck and the tests are separate jobs of ci.yaml, so the image only builds.
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_SENTRY_DSN=""
RUN npx vite build

FROM nginxinc/nginx-unprivileged:stable-alpine3.24@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

# The base image is rebuilt every few weeks, so a package can have a fix that the image does not have yet. Trivy fails the
# build on a fixed CRITICAL or HIGH vulnerability, and the upgrade below takes the fixes from the Alpine repository.
# The date is a build argument that CI changes every day. A RUN step sees the arguments as environment variables, so a new date
# makes the next build run the upgrade again instead of taking an old layer from the build cache.
ARG PACKAGES_DATE=unset
USER root
RUN apk upgrade --no-cache

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8080

USER 101

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
