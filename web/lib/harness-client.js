// Server-only helper for talking to the harness sidecar.
// HARNESS_URL is reachable inside the popebot docker network (typically
// "http://harness:8080"). HARNESS_API_KEY must be in the event-handler
// container env; never leak it to the browser.

const BASE = process.env.HARNESS_URL || 'http://harness:8080';
const KEY = process.env.HARNESS_API_KEY || '';

function headers(actor) {
  const h = { 'x-harness-key': KEY };
  if (actor) h['x-actor-email'] = actor;
  return h;
}

async function jsonOrError(res) {
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(body?.error || `harness ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function listRuns({ status, kind, limit = 100 } = {}) {
  const qs = new URLSearchParams();
  if (kind) qs.set('kind', kind);
  if (limit) qs.set('limit', String(limit));
  const res = await fetch(`${BASE}/runs?${qs}`, { headers: headers(), cache: 'no-store' });
  const data = await jsonOrError(res);
  const rows = data?.rows || [];
  return status ? rows.filter(r => r.status === status) : rows;
}

export async function getRun(id) {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(id)}`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

export async function listQueue({ status, limit = 100 } = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (limit) qs.set('limit', String(limit));
  const res = await fetch(`${BASE}/queue?${qs}`, { headers: headers(), cache: 'no-store' });
  const data = await jsonOrError(res);
  return data?.rows || [];
}

export async function retryQueue(id, actor) {
  const res = await fetch(`${BASE}/queue/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
    headers: headers(actor),
  });
  return jsonOrError(res);
}

export async function cancelQueue(id, actor) {
  const res = await fetch(`${BASE}/queue/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: headers(actor),
  });
  return jsonOrError(res);
}

export async function bulkCancel(status, actor) {
  const qs = new URLSearchParams({ status });
  const res = await fetch(`${BASE}/queue/bulk-cancel?${qs}`, {
    method: 'POST',
    headers: headers(actor),
  });
  return jsonOrError(res);
}
