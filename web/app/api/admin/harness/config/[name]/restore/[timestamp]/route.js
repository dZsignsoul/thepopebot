import { auth } from 'thepopebot/auth';
import { restoreSnapshot } from '../../../../../../../../lib/harness-client.js';

export async function POST(_req, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, timestamp } = await params;
  try {
    const res = await restoreSnapshot(name, timestamp, session.user.email || session.user.id);
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e.message || 'harness error' }, { status: e.status || 502 });
  }
}
