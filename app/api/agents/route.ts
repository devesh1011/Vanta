import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { agentService } from '@/lib/agents/agent-service';
import { createNearAccount } from '@/lib/agents/near-account';
import { taskHistoryService } from '@/lib/agents/task-history-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agents
 * Creates a new autonomous agent
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'Agent name must be less than 255 characters' },
        { status: 400 }
      );
    }

    // Create NEAR account
    console.log('Creating NEAR account for agent...');
    const nearAccount = await createNearAccount();
    console.log(`NEAR account created: ${nearAccount.accountId}`);

    // Create agent in database
    const agent = await agentService.createAgent(
      session.user.id,
      nearAccount.accountId,
      nearAccount.publicKey,
      nearAccount.privateKey,
      {
        name: name.trim(),
        description: description?.trim(),
      }
    );

    // Log the account creation/funding as a task in the agent's history
    try {
      const isFunded = nearAccount.fundedAmount && parseFloat(nearAccount.fundedAmount) > 0;
      
      const task = await taskHistoryService.createTask({
        agentId: agent.id,
        taskType: 'setup',
        taskDescription: isFunded 
          ? 'Initial funding from NEAR testnet faucet'
          : 'Account created (awaiting manual funding)',
        taskInput: {
          success: true,
          accountId: nearAccount.accountId,
          message: isFunded
            ? `Agent account created and funded with ${nearAccount.fundedAmount} NEAR from testnet faucet`
            : 'Account keys generated. Please send NEAR to this account to create it on-chain and enable agent execution.',
          fundingSource: isFunded ? 'NEAR Testnet Faucet' : 'Manual funding required',
          funded: isFunded,
          fundedAmount: nearAccount.fundedAmount
        }
      });
      
      // Update task status if funded
      if (isFunded) {
        await taskHistoryService.updateTask(task.id, {
          status: 'completed',
          taskOutput: {
            success: true,
            accountId: nearAccount.accountId,
            fundedAmount: nearAccount.fundedAmount
          }
        });
      }
      console.log(`✅ Account creation task logged for agent: ${agent.id}`);
    } catch (error) {
      console.error('❌ Failed to log account creation task:', error);
      // Don't fail agent creation if task logging fails
    }

    // Return agent details (without private key)
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
    console.error('Error creating agent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents
 * Lists all agents for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const agents = await agentService.listAgents(session.user.id);

    // Return agents without private keys
    return NextResponse.json({
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        accountId: agent.accountId,
        balance: agent.balance,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
