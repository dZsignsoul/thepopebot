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

// ── Task 12: config-editor helpers ─────────────────────────────────────
export async function getConfig(name) {
  const res = await fetch(`${BASE}/config/${encodeURIComponent(name)}`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

export async function putConfig(name, body, actor) {
  const res = await fetch(`${BASE}/config/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { ...headers(actor), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return jsonOrError(res);
}

export async function getRepoTriggers() {
  const res = await fetch(`${BASE}/config/REPO_TRIGGERS`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

export async function listSnapshots(name) {
  const res = await fetch(`${BASE}/config/${encodeURIComponent(name)}/snapshots`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

export async function restoreSnapshot(name, timestamp, actor) {
  const res = await fetch(`${BASE}/config/${encodeURIComponent(name)}/restore/${encodeURIComponent(timestamp)}`, {
    method: 'POST',
    headers: headers(actor),
  });
  return jsonOrError(res);
}

// ── Task 17: webhook delivery log helpers ──────────────────────────────
export async function listWebhookDeliveries({ outcome, limit = 100 } = {}) {
  const qs = new URLSearchParams();
  if (outcome) qs.set('outcome', outcome);
  if (limit) qs.set('limit', String(limit));
  const res = await fetch(`${BASE}/webhooks/deliveries?${qs}`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

export async function getWebhookDelivery(id) {
  const res = await fetch(`${BASE}/webhooks/deliveries/${encodeURIComponent(id)}`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

// ── Task 15: metrics ────────────────────────────────────────────────────
export async function getMetrics({ days = 30 } = {}) {
  const qs = new URLSearchParams({ days: String(days) });
  const res = await fetch(`${BASE}/metrics?${qs}`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}

// ── Task 16: crons ──────────────────────────────────────────────────────
export async function getCrons() {
  const res = await fetch(`${BASE}/crons`, { headers: headers(), cache: 'no-store' });
  return jsonOrError(res);
}
