import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { agentService } from '@/lib/agents/agent-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/[id]
 * Gets details for a specific agent
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

    // Return agent without private key
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        accountId: agent.accountId,
        balance: agent.balance,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[id]
 * Updates an agent (status, name, description)
 */
export async function PATCH(
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
    const body = await request.json();
    const { name, description, status } = body;

    // Validate status if provided
    if (status && !['active', 'paused', 'deleted'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, paused, or deleted' },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Agent name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.length > 255) {
        return NextResponse.json(
          { error: 'Agent name must be less than 255 characters' },
          { status: 400 }
        );
      }
    }

    const agent = await agentService.updateAgent(
      id,
      session.user.id,
      {
        name: name?.trim(),
        description: description?.trim(),
        status,
      }
    );

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Return updated agent without private key
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        accountId: agent.accountId,
        balance: agent.balance,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Deletes an agent (soft delete)
 */
export async function DELETE(
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
    const deleted = await agentService.deleteAgent(id, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
