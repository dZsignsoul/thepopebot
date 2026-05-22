// Task 34: in-browser form for spawning a new agent job.
// Marker for chunks verification: 'task-34-new-agent-job-form'.
import { auth } from 'thepopebot/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NewJobForm from './form.js';

export const dynamic = 'force-dynamic';

export default async function NewAgentJobPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">New agent job</h1>
        <Link href="/admin/harness/runs" className="text-sm text-blue-600 hover:underline">
          ← All runs
        </Link>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Enqueue a new agent run. The harness queue worker picks it up within 10 seconds and
        spawns an agent-job container on the EC2 host.
      </p>

      <NewJobForm />
    </div>
  );
}
