import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { agentTaskHistory, agent } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/[id]/tasks
 * Fetches all task history for an agent
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await params;

    // Verify the agent belongs to the user
    const [agentRecord] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)))
      .limit(1);

    if (!agentRecord) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch all tasks for this agent, ordered by most recent first
    const tasks = await db
      .select()
      .from(agentTaskHistory)
      .where(eq(agentTaskHistory.agentId, agentId))
      .orderBy(desc(agentTaskHistory.createdAt))
      .limit(50);

    return NextResponse.json({
      tasks,
    });
  } catch (error) {
    console.error('Error fetching task history:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch task history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]/tasks
 * Deletes all task history for an agent
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: agentId } = await params;

    // Verify the agent belongs to the user
    const [agentRecord] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)))
      .limit(1);

    if (!agentRecord) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete all tasks for this agent
    await db.delete(agentTaskHistory).where(eq(agentTaskHistory.agentId, agentId));

    console.log(`✅ Cleared all task history for agent: ${agentId}`);

    return NextResponse.json({
      success: true,
      message: 'Task history cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing task history:', error);

    return NextResponse.json(
      {
        error: 'Failed to clear task history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
