# docker build -t clickhouse/docs-builder .
FROM node:22-bookworm-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    python3 \
    git \
    ca-certificates \
    aspell \
    aspell-en \
    wget && \
    ARCH=$(dpkg --print-architecture) && \
    wget -qO- "https://github.com/errata-ai/vale/releases/download/v3.9.5/vale_3.9.5_Linux_${ARCH}.tar.gz" | tar xz -C /usr/local/bin vale && \
    apt-get purge -y wget && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g mint@latest markdownlint-cli2 markdownlint-rule-helpers

ENV HOME=/tmp
WORKDIR /docs

ENTRYPOINT []