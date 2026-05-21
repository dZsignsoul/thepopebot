import { auth } from 'thepopebot/auth';
import { putConfig } from '../../../../../../lib/harness-client.js';

export async function PUT(req, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name } = await params;
  const body = await req.json();
  try {
    const res = await putConfig(name, body, session.user.email || session.user.id);
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e.message || 'harness error' }, { status: e.status || 502 });
  }
}
