import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { githubApi } from './github.js';
import { createModel } from '../ai/model.js';
import { getConfig } from '../config.js';
import { PROJECT_ROOT } from '../paths.js';
/**
 * Generate a short descriptive title for an agent job using the LLM.
 * Uses structured output to avoid thinking-token leaks with extended-thinking models.
 * @param {string} agentJobDescription - The full job description
 * @returns {Promise<string>} ~10 word title
 */
async function generateAgentJobTitle(agentJobDescription) {
  try {
    const model = await createModel({ maxTokens: 100 });
    const response = await model.withStructuredOutput(z.object({ title: z.string() })).invoke([
      ['system', 'Generate a descriptive ~10 word title for this agent job. The title should clearly describe what the job will do.'],
      ['human', agentJobDescription],
    ]);
    return response.title.trim() || agentJobDescription.slice(0, 80);
  } catch {
    // Fallback: first line, truncated
    const firstLine = agentJobDescription.split('\n').find(l => l.trim()) || agentJobDescription;
    return firstLine.replace(/^#+\s*/, '').trim().split(/\s+/).slice(0, 10).join(' ');
  }
}

/**
 * Create a new agent job: push branch to GitHub, then launch a local Docker container.
 * @param {string} agentJobDescription - The job description
 * @param {Object} [options] - Optional overrides
 * @param {string} [options.llmModel] - LLM model override
 * @param {string} [options.agentBackend] - Agent backend override ('claude-code', 'pi', etc.)
 * @returns {Promise<{agent_job_id: string, branch: string, title: string}>}
 */
async function createAgentJob(agentJobDescription, options = {}) {
  // Per-job target repo override (harness pass-through); falls back to env defaults.
  let owner, repoName;
  if (options.targetRepo) {
    const parts = String(options.targetRepo).split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid target_repo "${options.targetRepo}" — must be "owner/name"`);
    }
    [owner, repoName] = parts;
  } else {
    owner = process.env.GH_OWNER;
    repoName = process.env.GH_REPO;
  }
  const agentJobId = uuidv4();
  const branch = `agent-job/${agentJobId}`;
  const repo = `/repos/${owner}/${repoName}`;

  // Generate a short descriptive title
  const title = await generateAgentJobTitle(agentJobDescription);

  // 1. Get main branch SHA and its tree SHA
  const mainRef = await githubApi(`${repo}/git/ref/heads/main`);
  const mainSha = mainRef.object.sha;
  const mainCommit = await githubApi(`${repo}/git/commits/${mainSha}`);
  const baseTreeSha = mainCommit.tree.sha;

  // 2. Build agent-job.config.json — single source of truth for job metadata
  const config = { title, job: agentJobDescription, target_repo: `${owner}/${repoName}` };
  if (options.llmModel) config.llm_model = options.llmModel;
  if (options.agentBackend) config.agent_backend = options.agentBackend;

  const treeEntries = [
    {
      path: `logs/${agentJobId}/agent-job.config.json`,
      mode: '100644',
      type: 'blob',
      content: JSON.stringify(config, null, 2),
    },
  ];

  // Patch 11: role-specialist system prompt for agent-job runs (supersedes
  // Patches 8 + 10). If a prompt file exists at
  // agent-job/prompts/SYSTEM_PROMPT.<agent>.md on EFS, commit it to the
  // branch as agent-job/SYSTEM.md. The upstream build-system-prompt.sh
  // script in the codex-cli image reads that file from the workspace and
  // sets SYSTEM_PROMPT naturally — no env-var clobbering, no shell-
  // expansion bugs with backticks.
  // Path sanitization defense-in-depth: harness validates agent_backend at
  // its boundary, but we don't trust callers blindly.
  // Marker for [[dockerfile-bundle-lesson]] grep: SYSTEM_PROMPT.${agent}.md
  if (options.agentBackend && /^[a-z][a-z0-9_-]*$/.test(options.agentBackend)) {
    try {
      const promptPath = path.join(PROJECT_ROOT, 'agent-job', 'prompts', `SYSTEM_PROMPT.${options.agentBackend}.md`);
      if (fs.existsSync(promptPath)) {
        const promptText = fs.readFileSync(promptPath, 'utf8');
        treeEntries.push({
          path: `agent-job/SYSTEM.md`,
          mode: '100644',
          type: 'blob',
          content: promptText,
        });
        console.log(`[agent-job] committing role prompt for '${options.agentBackend}' as agent-job/SYSTEM.md (${promptText.length} bytes)`);
      }
    } catch (e) {
      console.error(`[agent-job] failed to read role prompt for '${options.agentBackend}':`, e.message);
    }
  }

  // 3. Create tree (base_tree preserves all existing files)
  const tree = await githubApi(`${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  });

  // 4. Create a single commit with job config
  const commit = await githubApi(`${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `🤖 Agent Job: ${title}`,
      tree: tree.sha,
      parents: [mainSha],
    }),
  });

  // 5. Create branch pointing to the commit
  await githubApi(`${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    }),
  });

  // 6. Launch Docker container locally (fire-and-forget with async cleanup)
  const repoSlug = `${owner}/${repoName}`;
  launchAgentJobContainer({
    agentJobId,
    repo: repoSlug,
    branch,
    title,
    description: agentJobDescription,
    codingAgent: options.agentBackend,
    llmModel: options.llmModel,
  }).catch(err => {
    console.error(`[agent-job] Failed to launch container for ${agentJobId}:`, err.message);
  });

  return { agent_job_id: agentJobId, branch, title };
}

/**
 * Launch the agent-job Docker container and handle cleanup after exit.
 * @param {object} params - Same as runAgentJobContainer options
 */
async function launchAgentJobContainer(params) {
  const { runAgentJobContainer, waitForContainer, removeContainer, removeVolume } = await import('./docker.js');

  const { containerName, volumeName } = await runAgentJobContainer(params);

  // Async cleanup: wait for container to exit, then remove the volume
  try {
    const exitCode = await waitForContainer(containerName);
    console.log(`[agent-job] ${params.agentJobId.slice(0, 8)} exited with code ${exitCode}`);
  } catch (err) {
    // Container may already be gone (AutoRemove)
    console.error(`[agent-job] wait error for ${params.agentJobId.slice(0, 8)}:`, err.message);
  }

  // Patch 6: explicitly force-remove the container, then retry volume removal
  // on 409 errors with backoff. Three race conditions to handle:
  //   1. AutoRemove=true is set, but it finishes a few ms after waitForContainer
  //      returns (which fires on exit state, not on container removal).
  //   2. Even after removeContainer returns success, the Docker daemon's
  //      volume-in-use map can lag by ~100-500 ms.
  //   3. removeContainer can silently 404 if AutoRemove already won the race —
  //      that's fine, force=true with 404→silent handles it.
  try {
    await removeContainer(containerName);
  } catch (err) {
    console.error(`[agent-job] failed to remove container ${containerName}:`, err.message);
  }

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await removeVolume(volumeName);
      console.log(`[agent-job] volume ${volumeName} removed (attempt ${attempt})`);
      break;
    } catch (err) {
      const is409 = /409/.test(err.message);
      if (is409 && attempt < maxAttempts) {
        const delayMs = 200 * attempt;
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      console.error(`[agent-job] failed to remove volume ${volumeName} after ${attempt} attempts:`, err.message);
      break;
    }
  }
}

export { createAgentJob };
