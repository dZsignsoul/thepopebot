**Summary**

The request is to confirm acceptance test 4 for issue/work item 36b: a legacy `/api/create-agent-job` request that does not specify plan mode should still create an autonomous agent job with the existing non-plan/full-code behavior. This is a regression check, not a request to add the feature itself.

**Acceptance criteria**

- A POST to `/api/create-agent-job` with the legacy payload shape, e.g. `{ "job": "..." }`, still succeeds.
- The request does not require any new plan-mode field or changed client payload.
- The created job still flows through `createAgentJob()` and starts an `agent-job` runtime container.
- The agent-job runtime still runs with code/full permissions, not plan/read-only permissions.
- Any regression test or manual check documents that `llm_model` and `agent_backend` remain optional.

**Affected files**

- `api/index.js` - handles `POST /api/create-agent-job` and currently accepts the legacy body shape.
- `lib/tools/create-agent-job.js` - creates the job branch/config and launches the agent-job container.
- `lib/tools/docker.js` - defines the env passed to the agent-job Docker container.
- `docker/coding-agent/scripts/agent-job/6_agent-run.sh` - forces `PERMISSION=code` for job runtime.
- best guess: a future test file or acceptance script - no formal test suite is apparent in the repo today.

**Suggested approach**

Add a focused regression check around the create-agent-job handler or the lower-level job launch path. Stub GitHub/Docker/LLM side effects, submit the legacy payload without any plan-mode field, and assert that the call succeeds and reaches the agent-job launch path without setting plan/read-only behavior.

If no automated test harness exists, document a manual acceptance command using `curl` against `/api/create-agent-job` with only `job` plus `x-api-key`, then verify the resulting container/job log uses `RUNTIME=agent-job` and `PERMISSION=code`.

**Risks**

- The repository does not appear to have an existing JavaScript test runner or conventional test layout, so adding an automated test may require choosing a harness.
- The route has external side effects: GitHub API calls, Docker container launch, title generation via LLM, and API-key auth all need mocking or a controlled manual environment.
- Ambiguity: “legacy non-plan” could refer either to omitting a new plan-mode parameter on `/api/create-agent-job` or to older clients expecting full permissions for autonomous jobs. This triage assumes both point to preserving `PERMISSION=code` for agent-job runtime.
