import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listQueue, getConfig, getRepoTriggers } from '../../../../lib/harness-client.js';

export const dynamic = 'force-dynamic';

function fmtBytes(b) {
  if (!b || b < 1024) return `${b || 0} B`;
  return `${(b / 1024).toFixed(1)} KB`;
}

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

const GLOBALS = ['TRIGGERS', 'NOTIFY', 'CRONS'];

export default async function ConfigIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rows = await Promise.all(GLOBALS.map(async (name) => {
    try {
      const data = await getConfig(name);
      return { name, size: data.size, mtime: data.mtime, missing: !data.content };
    } catch (e) {
      return { name, error: e.message };
    }
  }));

  let perRepo = [];
  let perRepoError = null;
  try {
    const r = await getRepoTriggers();
    perRepo = r.files || [];
  } catch (e) {
    perRepoError = e.message;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Harness config</h1>
      <p className="text-sm text-gray-600 mb-6">Edit the JSON configs on EFS. Saves are atomic and auto-snapshotted; restore from the editor page if you regret a change.</p>

      <h2 className="text-lg font-medium mb-2">Global</h2>
      <table className="w-full text-sm border-collapse mb-6">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Size</th>
            <th className="py-2 pr-3">Last modified</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-3 font-mono">{r.name}</td>
              <td className="py-2 pr-3">{r.error ? <span className="text-red-700">error</span> : (r.missing ? <span className="text-gray-500">missing</span> : fmtBytes(r.size))}</td>
              <td className="py-2 pr-3 text-xs text-gray-600">{r.error ? r.error : fmtTime(r.mtime)}</td>
              <td className="py-2 pr-3">
                <Link href={`/admin/harness/config/${r.name}`} className="text-blue-600 hover:underline">edit →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-lg font-medium mb-2">Per-repo trigger overlays</h2>
      {perRepoError && <div className="mb-3 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">{perRepoError}</div>}
      {perRepo.length === 0 && !perRepoError && (
        <p className="text-sm text-gray-500">No per-repo overlays. Create one by adding <code className="font-mono text-xs">HARNESS_TRIGGERS.&lt;owner&gt;__&lt;repo&gt;.json</code> on EFS, or via the CLI: <code className="font-mono text-xs">popebot config edit TRIGGERS.owner__repo</code>.</p>
      )}
      {perRepo.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3">Repo</th>
              <th className="py-2 pr-3">File</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {perRepo.map(f => {
              const name = `TRIGGERS.${f.repo?.replace('/', '__')}`;
              return (
                <tr key={f.file} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono">{f.repo}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{f.file}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/admin/harness/config/${name}`} className="text-blue-600 hover:underline">edit →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
