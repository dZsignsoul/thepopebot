import { auth } from 'thepopebot/auth';
import { bulkCancel } from '../../../../../../lib/harness-client.js';

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  try {
    const body = await bulkCancel(status, session.user.email || session.user.id);
    return Response.json(body);
  } catch (e) {
    return Response.json({ error: e.message || 'harness error' }, { status: e.status || 502 });
  }
}
