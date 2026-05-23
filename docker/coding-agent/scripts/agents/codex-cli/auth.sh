#!/bin/bash
# Codex CLI auth — credentials cached in ~/.codex/auth.json
#
# Patch 2 (popebot-aws-deploy task 35-followup + 36a refinement v3):
#
# popebot's $CODEX_OAUTH_TOKEN may be one of two shapes:
#
#   1. A raw ~/.codex/auth.json (modern codex 0.133+, JSON starting with `{`):
#        {"auth_mode":"chatgpt","OPENAI_API_KEY":null,"tokens":{...},...}
#      → write straight to ~/.codex/auth.json so codex's own refresh-token
#        logic can handle access_token expiry transparently.
#
#   2. A flat API key (no `{` prefix):
#        sk-proj-…
#      → pipe to `codex login --with-api-key`.
#
# IMPORTANT: a prior revision tried piping tokens.access_token to
# `codex login --with-access-token`, but that flag rejects JWT-shaped
# access tokens with "agent identity JWT payload is not valid JSON".
# The official path for OAuth/ChatGPT auth is the raw auth.json file.
#
# Marker: patch2-codex-oauth-json-detect.
if [ -n "$CODEX_OAUTH_TOKEN" ]; then
    if [ "${CODEX_OAUTH_TOKEN:0:1}" = "{" ]; then
        # OAuth JSON blob — write straight to ~/.codex/auth.json
        # (patch2-codex-oauth-json-detect, raw-blob path)
        mkdir -p ~/.codex
        printf '%s' "$CODEX_OAUTH_TOKEN" > ~/.codex/auth.json
        chmod 600 ~/.codex/auth.json
    else
        # Flat API key — fall back to upstream login flow
        echo "$CODEX_OAUTH_TOKEN" | codex login --with-api-key
    fi
elif [ -n "$OPENAI_API_KEY" ]; then
    echo "$OPENAI_API_KEY" | codex login --with-api-key
fi
