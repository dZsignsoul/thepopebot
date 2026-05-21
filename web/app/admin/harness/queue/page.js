import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listQueue } from '../../../../lib/harness-client.js';
import BulkCancelButton from './bulk-cancel.js';
import AutoRefresh from '../runs/auto-refresh.js';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = ['pending', 'awaiting_approval', 'running', 'failed', 'cancelled', 'done'];
const BULK_CANCELLABLE = new Set(['pending', 'awaiting_approval', 'running']);

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

export default async function HarnessQueuePage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const status = sp?.status || 'pending';

  let rows = [];
  let fetchError = null;
  try {
    rows = await listQueue({ status, limit: 200 });
  } catch (e) {
    fetchError = e.message || String(e);
  }

  return (
    <div className="p-6">
      <AutoRefresh seconds={5} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Harness Queue</h1>
        <Link href="/admin/harness/runs" className="text-sm text-blue-600 hover:underline">← Runs</Link>
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {STATUS_FILTERS.map(s => {
          const href = `/admin/harness/queue?status=${s}`;
          const active = status === s;
          return (
            <Link
              key={s}
              href={href}
              className={`px-3 py-1 rounded border ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      {fetchError && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          Harness unreachable: {fetchError}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {rows.length} row{rows.length === 1 ? '' : 's'} · auto-refresh 5s
        </div>
        {BULK_CANCELLABLE.has(status) && rows.length > 0 && (
          <BulkCancelButton status={status} count={rows.length} />
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-3">Enqueued</th>
            <th className="py-2 pr-3">ID</th>
            <th className="py-2 pr-3">Source</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Attempts</th>
            <th className="py-2 pr-3">Agent Job</th>
            <th className="py-2 pr-3">Target Repo</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !fetchError && (
            <tr><td colSpan={7} className="py-4 text-gray-500">No rows.</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-3 font-mono text-xs">{fmtTime(r.enqueued_at)}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
              <td className="py-2 pr-3">{r.source || '—'}</td>
              <td className="py-2 pr-3">{r.status}</td>
              <td className="py-2 pr-3">{r.attempts ?? 0}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.agent_job_id ? r.agent_job_id.slice(0, 8) : '—'}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.target_repo || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
