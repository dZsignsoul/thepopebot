'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BulkCancelButton({ status, count }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onClick() {
    const msg = status === 'running'
      ? `Cancel all ${count} RUNNING rows? Best-effort: DB flips immediately, agent containers finish naturally. Continue?`
      : `Cancel all ${count} ${status} rows?`;
    if (!confirm(msg)) return;

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/harness/queue/bulk-cancel?status=${encodeURIComponent(status)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${res.status} ${res.statusText}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {err && <span className="text-sm text-red-700">{err}</span>}
      <button
        onClick={onClick}
        disabled={busy}
        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded disabled:opacity-50"
      >
        {busy ? '…' : `Cancel all ${count} ${status}`}
      </button>
    </div>
  );
}
