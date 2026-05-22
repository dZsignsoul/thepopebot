#!/bin/bash
# Codex CLI auth — credentials cached in ~/.codex/auth.json
#
# Patch 2 (popebot-aws-deploy task 35-followup + 36a refinement):
# popebot's $CODEX_OAUTH_TOKEN may be one of three shapes:
#
#   1. A raw ~/.codex/auth.json (modern codex 0.133+):
#        {"auth_mode":"chatgpt","OPENAI_API_KEY":null,"tokens":{"id_token":...,"access_token":...,"refresh_token":...},...}
#      → we extract tokens.access_token and pipe to `codex login --with-access-token`,
#        which is the OFFICIAL way to import an OAuth session into a container.
#
#   2. A legacy wrapped blob (older popebot installs):
#        {"name":"pro","token":"{\"iv\":\"...\",\"ciphertext\":\"...\"}"}
#      → unusable in a container (encrypted with the host's keychain); fall through
#        to writing the literal contents to ~/.codex/auth.json. Codex will fail,
#        but at least logs are loud.
#
#   3. A flat API key (no `{` prefix):
#        sk-proj-…
#      → pipe to `codex login --with-api-key`.
#
# Marker: patch2-codex-oauth-json-detect.
if [ -n "$CODEX_OAUTH_TOKEN" ]; then
    if [ "${CODEX_OAUTH_TOKEN:0:1}" = "{" ]; then
        # JSON shape. Try to extract tokens.access_token (shape #1).
        ACCESS_TOKEN=$(printf '%s' "$CODEX_OAUTH_TOKEN" | jq -r '.tokens.access_token // empty' 2>/dev/null)
        if [ -n "$ACCESS_TOKEN" ]; then
            # Shape #1: modern raw auth.json → use --with-access-token
            # (patch2-codex-oauth-json-detect, shape-1)
            echo "$ACCESS_TOKEN" | codex login --with-access-token
        else
            # Shape #2 or unknown JSON: write as-is to ~/.codex/auth.json as a
            # last-resort fallback. (patch2-codex-oauth-json-detect, shape-2)
            mkdir -p ~/.codex
            printf '%s' "$CODEX_OAUTH_TOKEN" > ~/.codex/auth.json
            chmod 600 ~/.codex/auth.json
        fi
    else
        # Shape #3: flat API key.
        echo "$CODEX_OAUTH_TOKEN" | codex login --with-api-key
    fi
elif [ -n "$OPENAI_API_KEY" ]; then
    echo "$OPENAI_API_KEY" | codex login --with-api-key
fi
