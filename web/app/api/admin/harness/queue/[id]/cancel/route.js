import { auth } from 'thepopebot/auth';
import { cancelQueue } from '../../../../../../../lib/harness-client.js';

export async function POST(_req, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await cancelQueue(id, session.user.email || session.user.id);
    return Response.json(body);
  } catch (e) {
    return Response.json({ error: e.message || 'harness error' }, { status: e.status || 502 });
  }
}
