import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { agentService } from '@/lib/agents/agent-service';
import { fetchAccountBalance } from '@/lib/agents/balance-monitor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/[id]/balance
 * Fetches the current balance from the NEAR blockchain
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const agent = await agentService.getAgent(id, session.user.id);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Fetch balance from blockchain
    const balance = await fetchAccountBalance(agent.accountId);

    return NextResponse.json({
      accountId: agent.accountId,
      balance,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
