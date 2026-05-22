// Task 34: next-auth-guarded proxy → harness POST /queue/enqueue.
// Marker for chunks verification: 'task-34-enqueue-proxy'.
import { auth } from 'thepopebot/auth';
import { enqueueJob } from '../../../../../../lib/harness-client.js';

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { job, target_repo, agent } = payload || {};

  if (!job || typeof job !== 'string' || job.trim().length < 10) {
    return Response.json({ error: 'job required (min 10 chars)' }, { status: 400 });
  }
  if (target_repo && !/^[\w.-]+\/[\w.-]+$/.test(target_repo)) {
    return Response.json({ error: 'target_repo must be "owner/name"' }, { status: 400 });
  }
  if (agent && !/^[a-z][a-z0-9_-]*$/.test(agent)) {
    return Response.json({ error: 'agent must be lowercase alphanumeric' }, { status: 400 });
  }

  try {
    const actor = session.user.email || session.user.id;
    const body = await enqueueJob({ job: job.trim(), target_repo, agent }, actor);
    return Response.json(body);
  } catch (e) {
    return Response.json({ error: e.message || 'harness error' }, { status: e.status || 502 });
  }
}
