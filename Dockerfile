# syntax=docker/dockerfile:1
# -------------------------------------------------------------------
# Stage 1: Build deemix-server binary
# -------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:18-bookworm-slim AS builder

ARG TARGETARCH=amd64
ARG STATIC_URL

WORKDIR /build

# Install build dependencies with apt cache mount
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    jq \
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

# Copy source code after dependencies are installed
COPY src/ /build/src/

# If STATIC_URL is provided, download prebuilt binary; otherwise build from source
RUN if [ -n "$STATIC_URL" ]; then \
        echo "Fetching prebuilt deemix-server from ${STATIC_URL}..." && \
        curl -fsSL "${STATIC_URL}/deemix-server-linux-${TARGETARCH}" -o /deemix-server; \
    else \
        echo "Building deemix-server from local source..." && \
        # Configure pkg target based on TARGETARCH \
        case "${TARGETARCH}" in \
            "amd64") PKG_TARGET="node16-linuxstatic-x64"; BIN_PATH="dist/deemix-server-x64" ;; \
            "arm64") PKG_TARGET="node16-linuxstatic-arm64"; BIN_PATH="dist/deemix-server-arm64" ;; \
            "arm"|"arm/v7") PKG_TARGET="node16-linuxstatic-armv7"; BIN_PATH="dist/deemix-server-armv7" ;; \
            *) PKG_TARGET="node16-linuxstatic-x64"; BIN_PATH="dist/deemix-server-x64" ;; \
        esac && \
        jq --arg t "$PKG_TARGET" '.pkg.targets = [$t]' server/package.json > tmp.$$.json && mv tmp.$$.json server/package.json && \
        yarn dist-server && \
        (cp "${BIN_PATH}" /deemix-server || cp dist/deemix-server* /deemix-server); \
    fi && \
    chmod +x /deemix-server

# -------------------------------------------------------------------
# Stage 2: Final runtime image
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

COPY --from=builder /deemix-server /deemix-server
COPY root/ /
RUN chmod +x /etc/services.d/deemix/run /etc/cont-init.d/*

EXPOSE 6595
ENTRYPOINT [ "/init" ]
