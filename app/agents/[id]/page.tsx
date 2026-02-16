import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { AgentDetailPage } from '@/components/agents/agent-detail-page';

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  return <AgentDetailPage agentId={id} />;
}
