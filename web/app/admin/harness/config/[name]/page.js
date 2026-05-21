import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getConfig, listSnapshots } from '../../../../../lib/harness-client.js';
import ConfigEditor from './editor.js';

export const dynamic = 'force-dynamic';

export default async function ConfigEditPage({ params }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { name } = await params;

  let initial = null;
  let mtime = null;
  let size = 0;
  let snapshots = [];
  let fetchError = null;
  try {
    const data = await getConfig(name);
    initial = data.content;
    mtime = data.mtime;
    size = data.size;
    const snap = await listSnapshots(name);
    snapshots = snap.snapshots || [];
  } catch (e) {
    fetchError = e.message || String(e);
  }

  return (
    <div className="p-6">
      <Link href="/admin/harness/config" className="text-sm text-blue-600 hover:underline">← All configs</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Edit {name}</h1>
      <p className="text-xs text-gray-500 mb-4">
        {mtime ? `Last saved ${new Date(mtime).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z')}` : ''}
        {size ? ` · ${size} bytes` : ''}
        {snapshots.length > 0 ? ` · ${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'}` : ''}
      </p>

      {fetchError && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          {fetchError}
        </div>
      )}

      {!fetchError && (
        <ConfigEditor
          name={name}
          initial={initial}
          snapshots={snapshots}
        />
      )}
    </div>
  );
}
