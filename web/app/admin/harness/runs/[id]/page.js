import { auth } from 'thepopebot/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getRun } from '../../../../../lib/harness-client.js';
import RunActions from './run-actions.js';

export const dynamic = 'force-dynamic';

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

export default async function RunDetailPage({ params }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  let data;
  let fetchError = null;
  try {
    data = await getRun(id);
  } catch (e) {
    if (e.status === 404) notFound();
    fetchError = e.message || String(e);
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <BackLink />
        <div className="p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          Harness unreachable: {fetchError}
        </div>
      </div>
    );
  }

  const { run, queue, approval } = data;

  return (
    <div className="p-6 space-y-6">
      <BackLink />

      <div>
        <h1 className="text-2xl font-semibold mb-1">Run {run.id.slice(0, 8)}</h1>
        <div className="text-sm text-gray-600">
          {run.kind} · {run.name || '—'} · <span className={statusClass(run.status)}>{run.status}</span>
        </div>
      </div>

      {queue && (
        <RunActions
          queueId={queue.id}
          queueStatus={queue.status}
          currentUserEmail={session.user.email}
        />
      )}

      <section>
        <h2 className="text-lg font-medium mb-2">Run</h2>
        <Kv label="ID" value={run.id} mono />
        <Kv label="Started" value={fmtTime(run.started_at)} />
        <Kv label="Finished" value={fmtTime(run.finished_at)} />
        <Kv label="Status" value={run.status} />
        <Kv label="Branch" value={run.branch} mono />
        <Kv label="Target repo" value={run.target_repo} mono />
        <Kv label="Agent job id" value={run.agent_job_id} mono />
        {run.error && <Kv label="Error" value={run.error} />}
        {run.job && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">Job text</div>
            <pre className="text-xs bg-gray-50 border rounded p-3 whitespace-pre-wrap">{run.job}</pre>
          </div>
        )}
      </section>

      {queue ? (
        <section>
          <h2 className="text-lg font-medium mb-2">Queue row</h2>
          <Kv label="Queue ID" value={queue.id} mono />
          <Kv label="Status" value={queue.status} />
          <Kv label="Source" value={queue.source} />
          <Kv label="Attempts" value={String(queue.attempts ?? 0)} />
          <Kv label="Enqueued" value={fmtTime(queue.enqueued_at)} />
          <Kv label="Started" value={fmtTime(queue.started_at)} />
          <Kv label="Finished" value={fmtTime(queue.finished_at)} />
          <Kv label="Next retry" value={fmtTime(queue.next_retry_at)} />
          <Kv label="Target repo" value={queue.target_repo} mono />
          {queue.error && <Kv label="Error" value={queue.error} />}
        </section>
      ) : (
        <section className="text-sm text-gray-500">No queue row joined to this run.</section>
      )}

      {approval && (
        <section>
          <h2 className="text-lg font-medium mb-2">Approval</h2>
          <Kv label="Status" value={approval.status} />
          <Kv label="Requested by" value={approval.requested_by} />
          <Kv label="Resolved by" value={approval.resolved_by} />
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return <Link href="/admin/harness/runs" className="text-sm text-blue-600 hover:underline">← All runs</Link>;
}

function Kv({ label, value, mono }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex text-sm py-0.5">
      <div className="w-40 text-gray-500">{label}</div>
      <div className={mono ? 'font-mono text-xs' : ''}>{value}</div>
    </div>
  );
}

function statusClass(s) {
  if (s === 'succeeded') return 'text-green-700';
  if (s === 'failed') return 'text-red-700';
  if (s === 'started' || s === 'running' || s === 'pending') return 'text-blue-700';
  if (s === 'cancelled') return 'text-gray-700';
  return 'text-gray-700';
}
