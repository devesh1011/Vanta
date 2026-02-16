import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { AgentDashboard } from '@/components/agents/agent-dashboard';

export default async function AgentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <AgentDashboard />;
}
