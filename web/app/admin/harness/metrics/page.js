import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMetrics } from '../../../../lib/harness-client.js';
import AutoRefresh from '../runs/auto-refresh.js';
import { StackedBarByDay, DurationLine, RepoFailureBars } from './charts.js';

export const dynamic = 'force-dynamic';

function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60000).toFixed(1)} min`;
}

export default async function MetricsPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  let days = parseInt(sp?.days || '30', 10);
  if (!Number.isFinite(days) || days <= 0) days = 30;
  if (days > 90) days = 90;

  let metrics = null;
  let fetchError = null;
  try {
    metrics = await getMetrics({ days });
  } catch (e) {
    fetchError = e.message || String(e);
  }

  const totals = metrics?.totals || { succeeded: 0, failed: 0, running: 0, started: 0, total: 0 };
  const successRate = totals.total > 0
    ? Math.round(100 * totals.succeeded / totals.total)
    : null;
  const avgAcrossDays = metrics?.by_day
    ? (() => {
        const samples = metrics.by_day.filter(d => d.avg_duration_ms != null);
        if (samples.length === 0) return null;
        const sum = samples.reduce((acc, d) => acc + d.avg_duration_ms, 0);
        return Math.round(sum / samples.length);
      })()
    : null;

  return (
    <div className="p-6">
      <AutoRefresh seconds={5} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Metrics</h1>
        <div className="flex items-center gap-3 text-sm">
          {[7, 30, 60, 90].map(d => (
            <Link
              key={d}
              href={`/admin/harness/metrics?days=${d}`}
              className={`px-3 py-1 rounded border ${days === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {d}d
            </Link>
          ))}
          <Link href="/admin/harness/runs" className="text-blue-600 hover:underline">Runs →</Link>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          Harness unreachable: {fetchError}
        </div>
      )}

      {/* Totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Stat label="Total" value={totals.total} />
        <Stat label="Succeeded" value={totals.succeeded} accent="text-green-700" />
        <Stat label="Failed" value={totals.failed} accent="text-red-700" />
        <Stat label="Success rate" value={successRate != null ? `${successRate}%` : '—'} />
        <Stat label="Avg duration" value={fmtMs(avgAcrossDays)} />
      </div>

      {metrics && totals.total === 0 && (
        <div className="p-6 border border-gray-200 rounded text-center text-gray-500 text-sm">
          No runs in the last {days} day{days === 1 ? '' : 's'}.
        </div>
      )}

      {metrics && totals.total > 0 && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium mb-2">Runs per day · last {days}d</h2>
            <div className="border rounded p-4 bg-white">
              <StackedBarByDay byDay={metrics.by_day} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-2">Avg duration per day</h2>
            <div className="border rounded p-4 bg-white">
              <DurationLine byDay={metrics.by_day} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-2">Top repos by activity</h2>
            <div className="border rounded p-4 bg-white">
              <RepoFailureBars byRepo={metrics.by_repo} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${accent || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
