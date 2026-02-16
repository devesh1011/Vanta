import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { executeAgent } from '@/lib/agents/agent-executor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for execution

/**
 * POST /api/agents/[id]/execute
 * Executes the agent's tasks based on its description
 */
export async function POST(
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
    console.log(`Starting agent execution for agent ${id}`);

    // Execute the agent
    const result = await executeAgent(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Agent execution failed',
          details: result.error,
          taskIds: result.taskIds,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agent execution completed',
      taskIds: result.taskIds,
    });

  } catch (error) {
    console.error('Error executing agent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to execute agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
