import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listWebhookDeliveries } from '../../../../lib/harness-client.js';
import AutoRefresh from '../runs/auto-refresh.js';

export const dynamic = 'force-dynamic';

const OUTCOME_FILTERS = ['all', 'fired', 'no_triggers', 'dedup_skip', 'rate_limit_skip', 'auth_fail', 'error', 'approval_resolved'];

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function outcomeClass(o) {
  if (o === 'fired') return 'text-green-700';
  if (o === 'no_triggers') return 'text-gray-600';
  if (o === 'dedup_skip') return 'text-blue-600';
  if (o === 'rate_limit_skip') return 'text-amber-700';
  if (o === 'auth_fail' || o === 'error') return 'text-red-700';
  if (o === 'approval_resolved') return 'text-purple-700';
  return 'text-gray-700';
}

export default async function WebhookDeliveriesPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const outcome = sp?.outcome && sp.outcome !== 'all' ? sp.outcome : undefined;

  let rows = [];
  let fetchError = null;
  try {
    const data = await listWebhookDeliveries({ outcome, limit: 100 });
    rows = data.rows || [];
  } catch (e) {
    fetchError = e.message || String(e);
  }

  return (
    <div className="p-6">
      <AutoRefresh seconds={5} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Webhook deliveries</h1>
        <div className="flex gap-2">
          <Link href="/admin/harness/runs" className="text-sm text-blue-600 hover:underline">Runs →</Link>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Every GitHub webhook hitting the harness, regardless of outcome. Auth failures, dedup skips, rate-limited deliveries, and successfully-fired triggers all show up here. Retained 7 days.
      </p>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {OUTCOME_FILTERS.map(s => {
          const href = s === 'all' ? '/admin/harness/webhooks' : `/admin/harness/webhooks?outcome=${s}`;
          const active = (outcome || 'all') === s;
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
        {rows.length} deliver{rows.length === 1 ? 'y' : 'ies'} · auto-refresh 5s
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-3">Received</th>
            <th className="py-2 pr-3">Event</th>
            <th className="py-2 pr-3">Action</th>
            <th className="py-2 pr-3">Repo</th>
            <th className="py-2 pr-3">Sig</th>
            <th className="py-2 pr-3">Outcome</th>
            <th className="py-2 pr-3">Fired</th>
            <th className="py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !fetchError && (
            <tr><td colSpan={8} className="py-4 text-gray-500">No deliveries yet.</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-3 font-mono text-xs">
                <Link href={`/admin/harness/webhooks/${r.id}`} className="text-blue-600 hover:underline">
                  {fmtTime(r.received_at)}
                </Link>
              </td>
              <td className="py-2 pr-3 font-mono text-xs">{r.event_type || '—'}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.action || '—'}</td>
              <td className="py-2 pr-3 font-mono text-xs">{r.repo || '—'}</td>
              <td className="py-2 pr-3">{r.signature_valid ? '✓' : <span className="text-red-700">✗</span>}</td>
              <td className="py-2 pr-3"><span className={outcomeClass(r.outcome)}>{r.outcome}</span></td>
              <td className="py-2 pr-3">{r.triggers_fired || 0}</td>
              <td className="py-2 pr-3">{r.response_status || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
