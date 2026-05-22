'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  {
    value: '',
    label: 'Default (codex-cli)',
    help: 'Full repo edits. Pushes a branch and opens a PR.',
  },
  {
    value: 'triage',
    label: 'triage',
    help: 'Read-only analysis. Writes logs/triage-*.md only. Use when you want to plan before doing.',
  },
  {
    value: 'code',
    label: 'code',
    help: 'Full repo edits. Pushes a branch (no merge). Use when you want code changed.',
  },
  {
    value: 'docs',
    label: 'docs',
    help: 'Docs only (docs/, README*, *.md). Use for documentation updates.',
  },
  {
    value: 'review',
    label: 'review',
    help: 'Reviews a PR. Provide PR number in the prompt. No code changes.',
  },
];

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export default function NewJobForm() {
  const router = useRouter();
  const [agent, setAgent] = useState('triage');
  const [targetRepo, setTargetRepo] = useState('dZsignsoul/popebot-test');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const trimmed = prompt.trim();
  const promptTooShort = trimmed.length > 0 && trimmed.length < 10;
  const repoBadFormat = targetRepo.length > 0 && !REPO_RE.test(targetRepo);
  const canSubmit = !busy && trimmed.length >= 10 && !repoBadFormat;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setErr(null);
    try {
      const body = { job: trimmed };
      if (targetRepo) body.target_repo = targetRepo;
      if (agent) body.agent = agent;

      const res = await fetch('/api/admin/harness/queue/enqueue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `${res.status} ${res.statusText}`);
      }
      router.push('/admin/harness/runs');
    } catch (e2) {
      setErr(e2.message || String(e2));
      setBusy(false);
    }
  }

  const currentRoleHelp = ROLES.find(r => r.value === agent)?.help || '';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {err && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          {err}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Role / agent</label>
        <div className="space-y-1.5">
          {ROLES.map(r => (
            <label key={r.value || 'default'} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="agent"
                value={r.value}
                checked={agent === r.value}
                onChange={() => setAgent(r.value)}
                disabled={busy}
                className="mt-1"
              />
              <span>
                <span className="font-mono">{r.label}</span>
                <span className="text-gray-500"> — {r.help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="target_repo" className="block text-sm font-medium mb-1">
          Target repo
        </label>
        <input
          id="target_repo"
          type="text"
          value={targetRepo}
          onChange={e => setTargetRepo(e.target.value)}
          placeholder="owner/name"
          disabled={busy}
          className={`w-full px-3 py-2 text-sm border rounded font-mono ${
            repoBadFormat ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {repoBadFormat && (
          <p className="text-xs text-red-700 mt-1">Format must be <code>owner/name</code>.</p>
        )}
      </div>

      <div>
        <label htmlFor="prompt" className="block text-sm font-medium mb-1">
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={
            agent === 'review'
              ? 'Review PR #17 in dZsignsoul/popebot-test. Look for ...'
              : 'What do you want the agent to do?'
          }
          rows={6}
          required
          disabled={busy}
          className={`w-full px-3 py-2 text-sm border rounded ${
            promptTooShort ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <p className="text-xs text-gray-500 mt-1">
          {trimmed.length} character{trimmed.length === 1 ? '' : 's'} · minimum 10
          {promptTooShort && <span className="text-red-700"> (too short)</span>}
        </p>
        {agent && (
          <p className="text-xs text-gray-500 mt-1 italic">
            Role hint: {currentRoleHelp}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {busy ? 'Enqueuing…' : 'Enqueue agent job'}
        </button>
        <span className="text-xs text-gray-500">
          The harness worker picks up new rows every ~10 seconds.
        </span>
      </div>
    </form>
  );
}
