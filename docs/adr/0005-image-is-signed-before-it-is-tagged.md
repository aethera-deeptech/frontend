# 0005 The image is signed before it is tagged

Status: Accepted

## Context

People pull an image by a tag such as `latest` or `1.2.3`. A tag that moves to an image before its signature exists leaves a window in which the image is unsigned. A second job may also run for a pull request and could try to publish under the same names.

## Decision

The publish job runs only for a push to `main`, a push of a version tag or a manual run from `main`. It pushes the image by digest with no tag, signs the index with cosign in keyless mode, verifies the signature against the identity of `docker.yaml`, attests an SBOM for each platform, and only then adds the tags. The Docker Hub mirror is a separate workflow in its own environment. It starts after the Docker workflow, so a pull request cannot change it. It copies an image only after it has checked the signature again, and it sets `latest` and the floating version tags after the signature has been copied and checked on Docker Hub.

## Consequences

- A failure before the tags are added leaves a digest and a signature tag in the registry, and no release tag moves.
- A floating tag such as `1` moves only for the newest release of its line.
- The signature is the same on both registries, so one cosign command checks either image.
- The image is built twice for a push to `main`, once to test it and once for production, which costs a few minutes of CI.
