import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listRuns } from '../../../../lib/harness-client.js';
import AutoRefresh from './auto-refresh.js';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = ['all', 'started', 'succeeded', 'failed'];

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

export default async function HarnessRunsPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const status = sp?.status && sp.status !== 'all' ? sp.status : undefined;

  let rows = [];
  let fetchError = null;
  try {
    rows = await listRuns({ status, limit: 100 });
  } catch (e) {
    fetchError = e.message || String(e);
  }

  return (
    <div className="p-6">
      <AutoRefresh seconds={5} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Harness Runs</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/harness/runs/new"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New agent job
          </Link>
          <Link href="/admin/harness/queue" className="text-sm text-blue-600 hover:underline">Queue →</Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {STATUS_FILTERS.map(s => {
          const href = s === 'all' ? '/admin/harness/runs' : `/admin/harness/runs?status=${s}`;
          const active = (status || 'all') === s;
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

      <div className="text-xs text-gray-500 mb-2">
        {rows.length} run{rows.length === 1 ? '' : 's'} · auto-refresh 5s
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-3">Time</th>
            <th className="py-2 pr-3">Kind</th>
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Agent Job</th>
            <th className="py-2 pr-3">Branch</th>
            <th className="py-2 pr-3">Target Repo</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !fetchError && (
            <tr><td colSpan={7} className="py-4 text-gray-500">No runs.</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-3 font-mono text-xs">
                <Link href={`/admin/harness/runs/${r.id}`} className="text-blue-600 hover:underline">
                  {fmtTime(r.started_at)}
                </Link>
              </td>
              <td className="py-2 pr-3">{r.kind || '—'}</td>
              <td className="py-2 pr-3">{r.name || '—'}</td>
              <td className="py-2 pr-3">
                <span className={statusClass(r.status)}>{r.status}</span>
              </td>
              <td className="py-2 pr-3 font-mono text-xs">{r.agent_job_id ? r.agent_job_id.slice(0, 8) : '—'}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.branch || '—'}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.target_repo || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusClass(s) {
  if (s === 'succeeded') return 'text-green-700';
  if (s === 'failed') return 'text-red-700';
  if (s === 'started') return 'text-blue-700';
  return 'text-gray-700';
}
