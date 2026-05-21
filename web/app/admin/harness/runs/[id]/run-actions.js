'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RETRYABLE = new Set(['failed', 'cancelled']);
const CANCELLABLE = new Set(['pending', 'awaiting_approval', 'running']);

export default function RunActions({ queueId, queueStatus, currentUserEmail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const canRetry = RETRYABLE.has(queueStatus);
  const canCancel = CANCELLABLE.has(queueStatus);
  if (!canRetry && !canCancel) return null;

  async function doAction(kind) {
    const verb = kind === 'retry' ? 'retry' : 'cancel';
    const warning = kind === 'cancel' && queueStatus === 'running'
      ? 'This row is RUNNING. Cancel is best-effort: the database flips to cancelled immediately, but the agent container will finish naturally and may still push its branch. Continue?'
      : `${verb.charAt(0).toUpperCase() + verb.slice(1)} this queue row?`;
    if (!confirm(warning)) return;

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/harness/queue/${encodeURIComponent(queueId)}/${verb}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${res.status} ${res.statusText}`);
      }
      router.push('/admin/harness/runs');
      router.refresh();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {canRetry && (
        <button
          onClick={() => doAction('retry')}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {busy ? '…' : 'Retry'}
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => doAction('cancel')}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded disabled:opacity-50"
        >
          {busy ? '…' : 'Cancel'}
        </button>
      )}
      <span className="text-xs text-gray-500">acting as {currentUserEmail}</span>
      {err && <span className="text-sm text-red-700">{err}</span>}
    </div>
  );
}
