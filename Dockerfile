# syntax=docker/dockerfile:1

# The build runs on the machine that builds the image, so an arm64 image needs no emulation. The result is plain files.
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

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8080

USER 101

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
