# syntax=docker/dockerfile:1
# -------------------------------------------------------------------
# Stage 1: Platform-independent JS bundler (compiles once on host platform)
# -------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:18-bookworm-slim AS bundler

WORKDIR /build

# Install build dependencies with apt cache mount
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    python3 \
    make \
    g++ \
    ca-certificates

# Copy package manifests and build scripts first for optimal layer caching
WORKDIR /build/src
COPY src/package.json src/yarn.lock /build/src/
COPY src/server/package.json src/server/yarn.lock /build/src/server/
COPY src/webui/package.json src/webui/yarn.lock /build/src/webui/
COPY src/scripts/ /build/src/scripts/

# Install dependencies using yarn cache mount
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn config set network-timeout 1000000 -g && \
    yarn install-all

# Copy version file and source code
COPY version /build/version
COPY src/ /build/src/

# Set version, patch dependencies, and compile JS bundles (server + webui)
RUN yarn set-version && \
    yarn patch-deps && \
    yarn predist

# -------------------------------------------------------------------
# Stage 2: Target-specific binary generator
# -------------------------------------------------------------------
FROM bundler AS binary-builder

ARG TARGETARCH=amd64
ARG STATIC_URL

WORKDIR /build/src

# If STATIC_URL is provided, download prebuilt binary; otherwise package with pkg
RUN if [ -n "$STATIC_URL" ]; then \
        echo "Fetching prebuilt deemix-server from ${STATIC_URL}..." && \
        curl -fsSL "${STATIC_URL}/deemix-server-linux-${TARGETARCH}" -o /deemix-server; \
    else \
        echo "Packaging deemix-server binary for target arch: ${TARGETARCH}..." && \
        case "${TARGETARCH}" in \
            "amd64") PKG_TARGET="node16-linuxstatic-x64" ;; \
            "arm64") PKG_TARGET="node16-linuxstatic-arm64" ;; \
            "arm"|"arm/v7") PKG_TARGET="node16-linuxstatic-armv7" ;; \
            *) PKG_TARGET="node16-linuxstatic-x64" ;; \
        esac && \
        ./node_modules/.bin/pkg --target "$PKG_TARGET" --output /deemix-server ./server/package.json; \
    fi && \
    chmod +x /deemix-server

# -------------------------------------------------------------------
# Stage 3: Final runtime image
# -------------------------------------------------------------------
FROM lscr.io/linuxserver/baseimage-alpine:3.20

ARG BUILDDATE
ARG TARGETARCH
ENV BUILDDATEENV=${BUILDDATE}

LABEL \
    maintainer="tony-vs-code" \
    app.deemix.image.created="${BUILDDATE}" \
    app.deemix.image.url="https://github.com/tony-vs-code/deemix-docker" \
    app.deemix.image.title="Docker image for Deemix" \
    app.deemix.image.description="Docker image for Deemix music downloader web app"

RUN apk add --no-cache curl jq

COPY --from=binary-builder /deemix-server /deemix-server
COPY root/ /
RUN chmod +x /etc/services.d/deemix/run /etc/cont-init.d/*

EXPOSE 6595
ENTRYPOINT [ "/init" ]
