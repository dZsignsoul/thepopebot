# ── Stage 1: builder ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
# Rename package to avoid npm treating "thepopebot" as a self-install
RUN TPB_VERSION=$(node -p "require('./package.json').version") && \
    echo "{\"private\":true}" > package.json && \
    npm install --no-save "thepopebot@${TPB_VERSION}" tailwindcss @tailwindcss/postcss

# Apply patches against thepopebot npm package BEFORE next build.
# This is critical: Next.js (stage 2) bundles popebot's code into
# .next/server/chunks/*.js. If patches land after `next build`, the
# compiled output contains UPSTREAM code and the patches in node_modules/
# are never executed. See task 21 findings (2026-05-21) for the bug we
# hit when this order was wrong.
# Patches: 1 (resolveAgentImage), 4 (Harness nav tab), 5 (target_repo),
# 6 (force-remove container + 409 retry for volume cleanup).
COPY lib/tools/docker.js              ./node_modules/thepopebot/lib/tools/docker.js
COPY lib/tools/create-agent-job.js    ./node_modules/thepopebot/lib/tools/create-agent-job.js
# settings-layout patch needs BOTH .jsx (source) and .js (pre-compiled sibling
# that the npm package ships and Next.js actually imports from).
COPY lib/chat/components/settings-layout.jsx ./node_modules/thepopebot/lib/chat/components/settings-layout.jsx
COPY lib/chat/components/settings-layout.js  ./node_modules/thepopebot/lib/chat/components/settings-layout.js
COPY api/index.js                     ./node_modules/thepopebot/api/index.js

# ── Stage 2: Next.js build ───────────────────────────────────────
FROM node:22-bookworm-slim AS nextjs
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# Use a minimal package.json to avoid self-referencing exports
# (the repo package.json has name "thepopebot", which makes Node resolve
# imports like 'thepopebot/config' to ./config/ instead of node_modules)
RUN echo '{"private":true}' > package.json
COPY web/ ./
RUN ./node_modules/.bin/next build

# ── Stage 3: runtime ─────────────────────────────────────────────
FROM node:22-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git ca-certificates && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
RUN echo '{"private":true}' > package.json
COPY --from=nextjs /app/.next ./.next
COPY web/server.js web/next.config.mjs web/instrumentation.js web/middleware.js web/postcss.config.mjs ./

# Patches against thepopebot npm package. These overrides MUST stay in sync
# with the patched files in this repo (lib/tools/*, lib/chat/components/*,
# api/*). See README or commit history for what each patch does.
# Patches: 1 (resolveAgentImage), 4 (Harness nav tab), 5 (target_repo), 6
# (force-remove container before volume cleanup).
COPY lib/tools/docker.js              ./node_modules/thepopebot/lib/tools/docker.js
COPY lib/tools/create-agent-job.js    ./node_modules/thepopebot/lib/tools/create-agent-job.js
COPY lib/chat/components/settings-layout.jsx ./node_modules/thepopebot/lib/chat/components/settings-layout.jsx
COPY lib/chat/components/settings-layout.js  ./node_modules/thepopebot/lib/chat/components/settings-layout.js
COPY api/index.js                     ./node_modules/thepopebot/api/index.js

EXPOSE 80
CMD ["pm2-runtime", "--kill-timeout", "120000", "server.js"]
