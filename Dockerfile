# syntax=docker/dockerfile:1
# -------------------------------------------------------------------
# Stage 1: Build deemix application bundles
# -------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS builder

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
COPY version /build/version
COPY package.json /build/package.json

# Install dependencies using yarn cache mount
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn config set network-timeout 1000000 -g && \
    yarn install-all

# Copy source code after dependencies are installed
COPY src/ /build/src/

# Compile application and assemble /app distribution directory
RUN yarn set-version && \
    yarn patch-deps && \
    yarn predist && \
    mkdir -p /app/server /app/webui && \
    cp /build/src/package.json /app/package.json && \
    cp /build/version /app/version && \
    cp /build/src/server/package.json /app/server/package.json && \
    cp -r /build/src/server/dist /app/server/dist && \
    cp -r /build/src/server/node_modules /app/server/node_modules && \
    cp -r /build/src/webui/public /app/webui/public && \
    yarn reset-version

# -------------------------------------------------------------------
# Stage 2: Final runtime image (Native Node 20 LTS on Alpine)
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

RUN apk add --no-cache nodejs curl jq

COPY --from=builder /app /app
COPY root/ /
RUN chmod +x /etc/services.d/deemix/run /etc/cont-init.d/*

EXPOSE 6595
ENTRYPOINT [ "/init" ]
