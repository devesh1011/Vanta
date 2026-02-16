import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { agentService } from '@/lib/agents/agent-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/[id]/export-key
 * Exports the private key for an agent (for backup purposes)
 * WARNING: This exposes the private key - use with caution!
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
    const agent = await agentService.getAgentWithPrivateKey(
      id,
      session.user.id
    );

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Return the decrypted private key
    // WARNING: This is sensitive data!
    return NextResponse.json({
      accountId: agent.accountId,
      publicKey: agent.publicKey,
      privateKey: agent.decryptedPrivateKey,
      warning: 'Keep this private key secure! Anyone with this key can control the account.',
    });
  } catch (error) {
    console.error('Error exporting private key:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to export private key',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
