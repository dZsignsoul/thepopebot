#!/bin/bash
# Create PR with log permalink, then exit with agent's exit code.
# Task 35: skip `gh pr create` for read-only / branch-only roles. The role
# SYSTEM prompts explicitly forbid opening a PR for triage, docs, and review.
# Marker: task-35-role-aware-pr-skip.

cd /home/coding-agent/workspace

case "${AGENT_BACKEND:-}" in
    triage|docs|review)
        echo "[8_create-pr.sh] AGENT_BACKEND=${AGENT_BACKEND} — skipping PR creation per role contract (task-35-role-aware-pr-skip)"
        if [ "${AGENT_EXIT:-0}" -ne 0 ]; then
            echo "Agent exited with code ${AGENT_EXIT}"
            exit $AGENT_EXIT
        fi
        echo "Done. Agent Job ID: ${AGENT_JOB_ID}"
        exit 0
        ;;
esac

set +e

REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)
LOG_URL="https://github.com/${REPO_SLUG}/tree/${LOG_SHA}/logs/${AGENT_JOB_ID}"

gh pr create \
    --title "🤖 Agent Job: ${AGENT_JOB_TITLE}" \
    --body "📋 [View Job Logs](${LOG_URL})"$'\n\n---\n\n'"${AGENT_JOB_DESCRIPTION}" \
    --base main || true

set -e

# Re-raise failure so the container reports it
if [ "${AGENT_EXIT:-0}" -ne 0 ]; then
    echo "Agent exited with code ${AGENT_EXIT}"
    exit $AGENT_EXIT
fi

echo "Done. Agent Job ID: ${AGENT_JOB_ID}"
