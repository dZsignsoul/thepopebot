import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCrons } from '../../../../lib/harness-client.js';
import AutoRefresh from '../runs/auto-refresh.js';

export const dynamic = 'force-dynamic';

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function relativeTime(ms) {
  if (!ms) return null;
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function statusClass(s) {
  if (s === 'succeeded') return 'text-green-700';
  if (s === 'failed') return 'text-red-700';
  if (s === 'started') return 'text-blue-700';
  return 'text-gray-700';
}

// Tiny cron-expression humanizer (no deps). Handles only the common cases we use.
function humanize(schedule) {
  if (!schedule) return '';
  const parts = schedule.split(/\s+/);
  if (parts.length !== 5) return schedule;
  const [min, hr, dom, mon, dow] = parts;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let dowName = '';
  if (dow !== '*') {
    const n = parseInt(dow, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 6) dowName = dayNames[n];
  }
  const time = (/^\d+$/.test(hr) && /^\d+$/.test(min))
    ? `${hr.padStart(2, '0')}:${min.padStart(2, '0')} UTC`
    : null;
  if (dowName && time && dom === '*' && mon === '*') return `${dowName}s at ${time}`;
  if (time && dom === '*' && mon === '*' && dow === '*') return `Daily at ${time}`;
  return schedule;
}

export default async function CronsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  let rows = [];
  let fetchError = null;
  try {
    const data = await getCrons();
    rows = data.rows || [];
  } catch (e) {
    fetchError = e.message || String(e);
  }

  return (
    <div className="p-6">
      <AutoRefresh seconds={5} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Crons</h1>
        <Link href="/admin/harness/config/CRONS" className="text-sm text-blue-600 hover:underline">Edit CRONS.json →</Link>
      </div>

      {fetchError && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          Harness unreachable: {fetchError}
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Schedule</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Last run</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !fetchError && (
            <tr><td colSpan={5} className="py-4 text-gray-500">No crons in CRONS.json.</td></tr>
          )}
          {rows.map(c => {
            const rel = relativeTime(c.last_run?.started_at);
            return (
              <tr key={c.name} className={`border-b hover:bg-gray-50 ${c.enabled ? '' : 'opacity-60'}`}>
                <td className="py-2 pr-3 font-mono">{c.name || '—'}</td>
                <td className="py-2 pr-3">
                  <div className="font-mono text-xs">{c.schedule}</div>
                  <div className="text-xs text-gray-500">{humanize(c.schedule)}</div>
                </td>
                <td className="py-2 pr-3">
                  {c.last_run
                    ? <span className={statusClass(c.last_run.status)}>{c.last_run.status}</span>
                    : <span className="text-gray-500">never run</span>}
                  {!c.enabled && <span className="ml-2 text-xs text-gray-500">(disabled)</span>}
                </td>
                <td className="py-2 pr-3 text-xs">
                  {c.last_run ? (
                    <>
                      <div className="font-mono">{fmtTime(c.last_run.started_at)}</div>
                      {rel && <div className="text-gray-500">{rel}</div>}
                    </>
                  ) : '—'}
                </td>
                <td className="py-2 pr-3">
                  {c.last_run && (
                    <Link href={`/admin/harness/runs/${c.last_run.id}`} className="text-blue-600 hover:underline text-xs">last run →</Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-4">
        Cron runs are bridged into the harness via Patch 7 (lib/cron.js). Only fires AFTER event-handler:v15 deployed.
      </p>
    </div>
  );
}
