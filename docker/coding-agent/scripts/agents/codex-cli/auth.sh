#!/bin/bash
# Codex CLI auth — credentials cached in ~/.codex/auth.json
# Codex does NOT read OPENAI_API_KEY from env, must use `codex login`
#
# Patch 2 (popebot-aws-deploy task): popebot stores the codex auth
# credential as the *contents of `~/.codex/auth.json`* (an OAuth blob
# starting with `{`), not as a flat API key. Piping that JSON into
# `codex login --with-api-key` makes the server reject it as a
# malformed key. Detect the JSON shape and write the file directly.
# Marker: patch2-codex-oauth-json-detect.
if [ -n "$CODEX_OAUTH_TOKEN" ]; then
    if [ "${CODEX_OAUTH_TOKEN:0:1}" = "{" ]; then
        # OAuth JSON blob — write straight to ~/.codex/auth.json
        # (patch2-codex-oauth-json-detect)
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
