# Multi-stage Dockerfile for Umbrel Bitcoin Node app
#
# * dev: `docker compose up` builds the **dev** stage only
# hot-reloading backend container (the UI dev server lives in its own
# apps/ui/Dockerfile; both share a hoisted node_modules volume in the compose file).
#
# * production: `docker build ...` produces a single self-contained image with backend + UI + bitcoind
# single final image that contains
#  – compiled backend
#  – bundled React UI (Vite output → dist/public)
#  – compiled shared libs (libs/settings, libs/shared-types)
#  – bitcoind + bitcoin-cli binaries

###########################################
# Bitcoind
###########################################
FROM ghcr.io/retropex/bitcoin:29.4.1.knots20260508rc4@sha256:a8e9081c9277108077c1f92436fbd7322a11cb2597da97ac301661cfc55fb64e AS bitcoind_29_4_1
FROM ghcr.io/retropex/bitcoin:29.4.knots20260508@sha256:c8a561261565db77ef6a551013abd057d3e3ab9dea8535ba00a781b8d72d0619 AS bitcoind_29_4
FROM ghcr.io/retropex/bitcoin:29.3.knots20260508@sha256:5dabd6ddb1eb47ab87ce5d2a1eb478472eedf2f5967993a824c3e25c6890df98 AS bitcoind_29_3_3
FROM ghcr.io/retropex/bitcoin:29.3.knots20260507@sha256:366a8d1a939b002291a134aee6e03d1a10379f8dead646f8d30b296b88ee8380 AS bitcoind_29_3_2
FROM ghcr.io/retropex/bitcoin:29.3.knots20260210@sha256:fde0aeddc8fd04818e91e185c9eb43980b5d1a132bdc4bdcb681b20b1fad0b94 AS bitcoind_29_3
FROM ghcr.io/retropex/bitcoin:29.2.knots20251110@sha256:8b58084882c8abad948f2d154d46595a9147c1f4a5bd578ebabf68583905e305 AS bitcoind_29_2_2
FROM ghcr.io/retropex/bitcoin:29.2@sha256:2e3209117dd2d6ca5239d48fb44d71c218e99280ed180499f3036aff16a4b0f8 AS bitcoind_29_2
FROM ghcr.io/retropex/bitcoin:29.1@sha256:da5bb600703a7ed885f64dbe93a5cd970138f28319f2074b51e3544e141711ed AS bitcoind_29_1

##########################################################
# Dependencies layer — install every workspace deps
# Functions as a shared cache for dev & app-builder stages
##########################################################
FROM node:20-slim AS deps
WORKDIR /repo

# Copy only dependency manifests to keep this layer cache-friendly
COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
COPY apps/ui/package*.json apps/ui/

RUN npm ci --workspaces --include-workspace-root --install-strategy=hoisted

# Add npm binaries to PATH so subsequent stages can invoke tsc / vite / etc.
ENV PATH="/repo/node_modules/.bin:$PATH"

####################################################
# DEV-ONLY build stage: Backend hot-reload image
# - Not referenced by later COPY --from=… steps,
#   so it’s skipped during a plain `docker build`.
# - `docker compose up` targets it via `target: dev`
#   in the docker-compose.yml file.
####################################################
FROM deps AS dev
WORKDIR /repo/apps/backend

VOLUME /data

# bitcoind binaries
RUN mkdir -p /opt/bitcoind/v29.4.1.knots20260508rc4 /opt/bitcoind/v29.4.knots20260508 /opt/bitcoind/v29.3.knots20260508 /opt/bitcoind/v29.3.knots20260507 /opt/bitcoind/v29.3.knots20260210 /opt/bitcoind/v29.2.knots20251110 /opt/bitcoind/v29.2 /opt/bitcoind/v29.1
COPY --from=bitcoind_29_4_1 /bin/bitcoind    /opt/bitcoind/v29.4.1.knots20260508rc4/bitcoind
COPY --from=bitcoind_29_4_1 /bin/bitcoin-cli /opt/bitcoind/v29.4.1.knots20260508rc4/bitcoin-cli
COPY --from=bitcoind_29_4 /bin/bitcoind    /opt/bitcoind/v29.4.knots20260508/bitcoind
COPY --from=bitcoind_29_4 /bin/bitcoin-cli /opt/bitcoind/v29.4.knots20260508/bitcoin-cli
COPY --from=bitcoind_29_3_3 /bin/bitcoind    /opt/bitcoind/v29.3.knots20260508/bitcoind
COPY --from=bitcoind_29_3_3 /bin/bitcoin-cli /opt/bitcoind/v29.3.knots20260508/bitcoin-cli
COPY --from=bitcoind_29_3_2 /bin/bitcoind    /opt/bitcoind/v29.3.knots20260507/bitcoind
COPY --from=bitcoind_29_3_2 /bin/bitcoin-cli /opt/bitcoind/v29.3.knots20260507/bitcoin-cli
COPY --from=bitcoind_29_3 /bin/bitcoind    /opt/bitcoind/v29.3.knots20260210/bitcoind
COPY --from=bitcoind_29_3 /bin/bitcoin-cli /opt/bitcoind/v29.3.knots20260210/bitcoin-cli
COPY --from=bitcoind_29_2_2 /bin/bitcoind    /opt/bitcoind/v29.2.knots20251110/bitcoind
COPY --from=bitcoind_29_2_2 /bin/bitcoin-cli /opt/bitcoind/v29.2.knots20251110/bitcoin-cli
COPY --from=bitcoind_29_2 /bin/bitcoind    /opt/bitcoind/v29.2/bitcoind
COPY --from=bitcoind_29_2 /bin/bitcoin-cli /opt/bitcoind/v29.2/bitcoin-cli
COPY --from=bitcoind_29_1 /bin/bitcoind    /opt/bitcoind/v29.1/bitcoind
COPY --from=bitcoind_29_1 /bin/bitcoin-cli /opt/bitcoind/v29.1/bitcoin-cli

# Give 1000:1000 write permisions to /opt/bitcoind (just directory) so we can flip the symbolic link while the container runs as 1000:1000
RUN chown 1000:1000 /opt/bitcoind

# Symbolic link for default bitcoind binary
# By default we point to the latest version of Bitcoin Knots
RUN ln -sfn /opt/bitcoind/v29.4.1.knots20260508rc4 /opt/bitcoind/current
RUN ln -sfn /opt/bitcoind/current/bitcoind    /usr/local/bin/bitcoind
RUN ln -sfn /opt/bitcoind/current/bitcoin-cli /usr/local/bin/bitcoin-cli

# Symlink for datadir so bitcoin-cli auto-finds the RPC cookie
# Allows exec'ing bitcoin-cli inside the container without specifying credentials
RUN ln -sfn /data/bitcoin /root/.bitcoin
RUN mkdir -p /home/node \
 && ln -sfn /data/bitcoin /home/node/.bitcoin \
 && chown -h 1000:1000 /home/node/.bitcoin

CMD ["npm","run","dev"]

#################################################
# app-builder stage
#################################################
FROM deps AS app-builder
WORKDIR /repo
COPY . .

# build shared libraries (libs/*/dist)
# build backend (ts → js) (apps/backend/dist)
# bundle UI (vite build) (apps/ui/dist)
RUN tsc -b libs/shared-types libs/settings apps/backend \
 && npm run --workspace apps/ui build

########################################
# runtime stage — final production image
########################################
FROM node:20-slim AS runtime
WORKDIR /app

# Install production dependencies only
# Note: import-map lives in package.json, so is also needed so Node can resolve "#settings/#types"
  COPY package*.json ./
  COPY apps/backend/package*.json apps/backend/
  RUN npm ci --omit=dev --install-strategy=hoisted --ignore-scripts

# Backend JS bundle
COPY --from=app-builder /repo/apps/backend/dist ./dist

# Pre-bundled React UI → backend serves this from /public/*
COPY --from=app-builder /repo/apps/ui/dist ./dist/public

# Compiled shared libs (referenced at runtime via import-map)
COPY --from=app-builder /repo/libs/settings/dist ./libs/settings/dist
COPY --from=app-builder /repo/libs/shared-types/dist ./libs/shared-types/dist

# bitcoind binaries
RUN mkdir -p /opt/bitcoind/v29.4.1.knots20260508rc4 /opt/bitcoind/v29.4.knots20260508 /opt/bitcoind/v29.3.knots20260508 /opt/bitcoind/v29.3.knots20260507 /opt/bitcoind/v29.3.knots20260210 /opt/bitcoind/v29.2.knots20251110 /opt/bitcoind/v29.2 /opt/bitcoind/v29.1
COPY --from=bitcoind_29_4_1 /bin/bitcoind    /opt/bitcoind/v29.4.1.knots20260508rc4/bitcoind
COPY --from=bitcoind_29_4_1 /bin/bitcoin-cli /opt/bitcoind/v29.4.1.knots20260508rc4/bitcoin-cli
COPY --from=bitcoind_29_4 /bin/bitcoind    /opt/bitcoind/v29.4.knots20260508/bitcoind
COPY --from=bitcoind_29_4 /bin/bitcoin-cli /opt/bitcoind/v29.4.knots20260508/bitcoin-cli
COPY --from=bitcoind_29_3_3 /bin/bitcoind    /opt/bitcoind/v29.3.knots20260508/bitcoind
COPY --from=bitcoind_29_3_3 /bin/bitcoin-cli /opt/bitcoind/v29.3.knots20260508/bitcoin-cli
COPY --from=bitcoind_29_3_2 /bin/bitcoind    /opt/bitcoind/v29.3.knots20260507/bitcoind
COPY --from=bitcoind_29_3_2 /bin/bitcoin-cli /opt/bitcoind/v29.3.knots20260507/bitcoin-cli
COPY --from=bitcoind_29_3 /bin/bitcoind    /opt/bitcoind/v29.3.knots20260210/bitcoind
COPY --from=bitcoind_29_3 /bin/bitcoin-cli /opt/bitcoind/v29.3.knots20260210/bitcoin-cli
COPY --from=bitcoind_29_2_2 /bin/bitcoind    /opt/bitcoind/v29.2.knots20251110/bitcoind
COPY --from=bitcoind_29_2_2 /bin/bitcoin-cli /opt/bitcoind/v29.2.knots20251110/bitcoin-cli
COPY --from=bitcoind_29_2 /bin/bitcoind    /opt/bitcoind/v29.2/bitcoind
COPY --from=bitcoind_29_2 /bin/bitcoin-cli /opt/bitcoind/v29.2/bitcoin-cli
COPY --from=bitcoind_29_1 /bin/bitcoind    /opt/bitcoind/v29.1/bitcoind
COPY --from=bitcoind_29_1 /bin/bitcoin-cli /opt/bitcoind/v29.1/bitcoin-cli

# Give 1000:1000 write permisions to /opt/bitcoind (just directory) so we can flip the symbolic link while the container runs as 1000:1000
RUN chown 1000:1000 /opt/bitcoind

# Symbolic link for default bitcoind binary
# By default we point to the latest version of Bitcoin Knots
RUN ln -sfn /opt/bitcoind/v29.4.1.knots20260508rc4 /opt/bitcoind/current
RUN ln -sfn /opt/bitcoind/current/bitcoind    /usr/local/bin/bitcoind
RUN ln -sfn /opt/bitcoind/current/bitcoin-cli /usr/local/bin/bitcoin-cli

# Symlink for datadir so bitcoin-cli auto-finds the RPC cookie
# Allows exec'ing bitcoin-cli inside the container without specifying credentials
RUN ln -sfn /data/bitcoin /root/.bitcoin
RUN mkdir -p /home/node \
 && ln -sfn /data/bitcoin /home/node/.bitcoin \
 && chown -h 1000:1000 /home/node/.bitcoin

 RUN apt-get update && apt-get install -y \
    curl


ENV NODE_ENV=production

# Data dirs inside /data
ENV BITCOIN_DIR=/data/bitcoin
ENV APP_STATE_DIR=/data/app

# 3000 = HTTP API, 8332 = RPC, 8333 = P2P
EXPOSE 3000 8332 8333
# app and bitcoind data
VOLUME /data

CMD ["node", "dist/server.js"]