'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

export default function ConfigEditor({ name, initial, snapshots }) {
  const router = useRouter();
  const [value, setValue] = useState(JSON.stringify(initial ?? [], null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [restoringTs, setRestoringTs] = useState('');

  async function onSave() {
    setError(null);
    let parsed;
    try { parsed = JSON.parse(value); }
    catch (e) { setError(`Invalid JSON: ${e.message}`); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/harness/config/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${res.status} ${res.statusText}`);
      }
      setSavedAt(Date.now());
      // Refresh server data (snapshots list will include the new entry).
      router.refresh();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    if (!restoringTs) return;
    if (!confirm(`Restore ${name} to snapshot at ${fmtTime(parseInt(restoringTs, 10))}? The current contents will themselves be snapshotted first.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/harness/config/${encodeURIComponent(name)}/restore/${encodeURIComponent(restoringTs)}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `${res.status} ${res.statusText}`);
      }
      router.refresh();
      // Force a reload so the editor picks up the restored content.
      window.location.reload();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={busy}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        {snapshots.length > 0 && (
          <>
            <select
              value={restoringTs}
              onChange={(e) => setRestoringTs(e.target.value)}
              className="text-sm border rounded px-2 py-1.5"
            >
              <option value="">Restore from snapshot…</option>
              {snapshots.map(s => (
                <option key={s.timestamp} value={s.timestamp}>{fmtTime(s.timestamp)} ({s.size} B)</option>
              ))}
            </select>
            <button
              onClick={onRestore}
              disabled={busy || !restoringTs}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded disabled:opacity-50"
            >
              Restore
            </button>
          </>
        )}
        {savedAt && !error && <span className="text-sm text-green-700">Saved at {fmtTime(savedAt)}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      <div className="border rounded overflow-hidden" style={{ height: '600px' }}>
        <Editor
          height="600px"
          language="json"
          value={value}
          onChange={(v) => setValue(v ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
