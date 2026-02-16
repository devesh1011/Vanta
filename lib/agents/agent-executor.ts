import { agentService } from './agent-service';
import { taskHistoryService } from './task-history-service';
import { planAgentTasks } from './task-planner';
import { fetchAvailableTokens, predictBestToken } from './token-analyzer';
import { executeTokenSwap } from './swap-executor';
import { fetchAccountBalance } from './balance-monitor';

export interface ExecutionResult {
  success: boolean;
  taskIds: string[];
  error?: string;
}

/**
 * Main agent execution orchestrator
 * Coordinates all tasks from planning to execution
 */
export async function executeAgent(
  agentId: string,
  userId: string
): Promise<ExecutionResult> {
  const taskIds: string[] = [];

  try {
    // Get agent with private key
    const agent = await agentService.getAgentWithPrivateKey(agentId, userId);
    
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'active') {
      throw new Error('Agent is not active');
    }

    // Get current balance
    const balance = await fetchAccountBalance(agent.accountId);
    console.log(`Agent balance: ${balance} NEAR`);

    // Task 1: Plan tasks using AI
    const planTask = await taskHistoryService.createTask({
      agentId,
      taskType: 'plan_tasks',
      taskDescription: 'Analyze agent description and create task plan',
      taskInput: { description: agent.description, balance },
    });
    taskIds.push(planTask.id);

    await taskHistoryService.updateTask(planTask.id, { status: 'running' });

    const tasks = await planAgentTasks(agent.description || 'Analyze and swap tokens', balance);

    await taskHistoryService.updateTask(planTask.id, {
      status: 'completed',
      taskOutput: { tasks },
    });

    // Task 2: Fetch available tokens
    const fetchTask = await taskHistoryService.createTask({
      agentId,
      taskType: 'fetch_tokens',
      taskDescription: 'Fetch available tokens from Ref Finance',
    });
    taskIds.push(fetchTask.id);

    await taskHistoryService.updateTask(fetchTask.id, { status: 'running' });

    const tokens = await fetchAvailableTokens();

    await taskHistoryService.updateTask(fetchTask.id, {
      status: 'completed',
      taskOutput: { tokenCount: tokens.length, tokens: tokens.slice(0, 10) },
    });

    // Task 3: Analyze and predict best token
    const predictTask = await taskHistoryService.createTask({
      agentId,
      taskType: 'predict_token',
      taskDescription: 'Use AI to analyze tokens and predict best investment',
      taskInput: { tokenCount: tokens.length },
    });
    taskIds.push(predictTask.id);

    await taskHistoryService.updateTask(predictTask.id, { status: 'running' });

    const prediction = await predictBestToken(tokens, agent.description || 'Find best token');

    await taskHistoryService.updateTask(predictTask.id, {
      status: 'completed',
      taskOutput: prediction,
    });

    // Extract swap amount from agent description
    // Look for patterns like "0.1 NEAR", "maximum 0.1 Near", "swap 0.5 NEAR", etc.
    let swapAmount = '0.5'; // Default fallback
    const description = agent.description || '';
    
    // Try to find amount patterns in the description
    const amountPatterns = [
      /maximum\s+(\d+\.?\d*)\s*near/i,
      /max\s+(\d+\.?\d*)\s*near/i,
      /swap\s+(\d+\.?\d*)\s*near/i,
      /(\d+\.?\d*)\s*near\s+token/i,
      /(\d+\.?\d*)\s*near/i,
    ];
    
    for (const pattern of amountPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount <= parseFloat(balance)) {
          swapAmount = match[1];
          console.log(`📊 Extracted swap amount from description: ${swapAmount} NEAR`);
          break;
        }
      }
    }

    // Task 4: Execute swap
    const swapTask = await taskHistoryService.createTask({
      agentId,
      taskType: 'execute_swap',
      taskDescription: `Swap ${swapAmount} NEAR for ${prediction.symbol}`,
      taskInput: {
        token: prediction.selectedToken,
        symbol: prediction.symbol,
        amount: swapAmount,
      },
    });
    taskIds.push(swapTask.id);

    await taskHistoryService.updateTask(swapTask.id, { status: 'running' });

    const swapResult = await executeTokenSwap(
      agent.accountId,
      agent.decryptedPrivateKey,
      prediction,
      swapAmount
    );

    if (swapResult.success) {
      await taskHistoryService.updateTask(swapTask.id, {
        status: 'completed',
        taskOutput: swapResult,
      });
    } else {
      await taskHistoryService.updateTask(swapTask.id, {
        status: 'failed',
        errorMessage: swapResult.error,
        taskOutput: swapResult,
      });
    }

    return {
      success: true,
      taskIds,
    };

  } catch (error) {
    console.error('Agent execution error:', error);

    // Mark any running tasks as failed
    for (const taskId of taskIds) {
      const task = await taskHistoryService.getTask(taskId);
      if (task && task.status === 'running') {
        await taskHistoryService.updateTask(taskId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: false,
      taskIds,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
