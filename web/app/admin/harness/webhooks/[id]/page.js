import { auth } from 'thepopebot/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getWebhookDelivery } from '../../../../../lib/harness-client.js';

export const dynamic = 'force-dynamic';

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

export default async function WebhookDeliveryDetailPage({ params }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  let data;
  let fetchError = null;
  try {
    data = await getWebhookDelivery(id);
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

  const { delivery: d, queue_ids } = data;
  let payload = null;
  let payloadParseError = null;
  if (d.payload_truncated) {
    try {
      payload = JSON.parse(d.payload_truncated.replace(/\n\.\.\. \(truncated\)$/, ''));
    } catch (e) {
      payloadParseError = e.message;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold mb-1">Delivery {d.id.slice(0, 8)}</h1>
        <div className="text-sm text-gray-600">
          {d.event_type}{d.action ? `.${d.action}` : ''} · {d.repo || 'no repo'} · <span className={outcomeClass(d.outcome)}>{d.outcome}</span>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Delivery</h2>
        <Kv label="Received" value={fmtTime(d.received_at)} />
        <Kv label="Event type" value={d.event_type} />
        <Kv label="Action" value={d.action} />
        <Kv label="Repo" value={d.repo} mono />
        <Kv label="GH delivery id" value={d.gh_delivery_id} mono />
        <Kv label="Source IP" value={d.source_ip} mono />
        <Kv label="Signature valid" value={d.signature_valid ? '✓ valid' : '✗ invalid'} />
        <Kv label="Outcome" value={d.outcome} />
        <Kv label="Triggers fired" value={String(d.triggers_fired || 0)} />
        <Kv label="Response status" value={String(d.response_status || '—')} />
      </section>

      {queue_ids && queue_ids.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-2">Queue rows created</h2>
          <ul className="text-sm space-y-1">
            {queue_ids.map(qid => (
              <li key={qid}>
                <code className="font-mono text-xs">{qid}</code>
                {/* Note: no direct link by queue ID, but the runs page joins on agent_job_id */}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium mb-2">Response body</h2>
        <pre className="text-xs bg-gray-50 border rounded p-3 whitespace-pre-wrap text-gray-900">{d.response_body || '(empty)'}</pre>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Payload {d.payload_truncated && d.payload_truncated.endsWith('(truncated)') && <span className="text-xs text-amber-700">(truncated to 5 KB)</span>}</h2>
        {payloadParseError && (
          <div className="mb-3 p-2 border border-amber-300 bg-amber-50 text-amber-800 text-xs rounded">
            Payload parse error: {payloadParseError} — showing raw text below.
          </div>
        )}
        <pre className="text-xs bg-gray-50 border rounded p-3 whitespace-pre-wrap text-gray-900 overflow-auto" style={{ maxHeight: '600px' }}>
          {payload ? JSON.stringify(payload, null, 2) : (d.payload_truncated || '(no payload)')}
        </pre>
      </section>
    </div>
  );
}

function BackLink() {
  return <Link href="/admin/harness/webhooks" className="text-sm text-blue-600 hover:underline">← All deliveries</Link>;
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
