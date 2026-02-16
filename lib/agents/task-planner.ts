import { generateText } from 'ai';
import { createNearAI } from '@/lib/ai/providers/near-ai-sdk';

const nearAI = createNearAI({
  apiKey: process.env.NEAR_AI_API_KEY,
  endpoint: process.env.NEAR_AI_ENDPOINT,
});

export interface PlannedTask {
  type: string;
  description: string;
  order: number;
}

/**
 * Uses NEAR AI to analyze agent description and create a task plan
 * @param agentDescription The agent's goal/description
 * @param agentBalance Current NEAR balance
 * @returns Array of planned tasks
 */
export async function planAgentTasks(
  agentDescription: string,
  agentBalance: string
): Promise<PlannedTask[]> {
  const prompt = `You are an AI assistant helping to plan tasks for an autonomous trading agent on NEAR Protocol.

Agent Description: ${agentDescription}
Agent Balance: ${agentBalance} NEAR

Based on the agent's description, create a detailed task plan. The agent can:
1. Fetch available tokens from Ref Finance DEX
2. Analyze token prices and market data
3. Make predictions about which token to invest in
4. Execute token swaps on NEAR testnet

Please create a step-by-step task plan in JSON format. Each task should have:
- type: The type of task (fetch_tokens, analyze_market, predict_token, prepare_swap, execute_swap)
- description: A clear description of what the task does
- order: The execution order (1, 2, 3, etc.)

Return ONLY a valid JSON array of tasks, no other text.

Example format:
[
  {
    "type": "fetch_tokens",
    "description": "Fetch available tokens from Ref Finance testnet",
    "order": 1
  },
  {
    "type": "analyze_market",
    "description": "Analyze token prices and market trends",
    "order": 2
  }
]`;

  try {
    const result = await generateText({
      model: nearAI('Qwen/Qwen3-30B-A3B-Instruct-2507'),
      prompt,
      temperature: 0.7,
    });

    // Parse the JSON response
    const text = result.text.trim();
    
    // Extract JSON from markdown code blocks if present
    let jsonText = text;
    if (text.includes('```json')) {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    } else if (text.includes('```')) {
      const match = text.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }

    const tasks = JSON.parse(jsonText) as PlannedTask[];
    
    // Validate and sort tasks
    return tasks
      .filter(task => task.type && task.description && task.order)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error planning tasks:', error);
    
    // Fallback to default task plan
    return [
      {
        type: 'fetch_tokens',
        description: 'Fetch available tokens from Ref Finance testnet',
        order: 1,
      },
      {
        type: 'analyze_market',
        description: 'Analyze token prices and market data using AI',
        order: 2,
      },
      {
        type: 'predict_token',
        description: 'Predict the best token for investment',
        order: 3,
      },
      {
        type: 'prepare_swap',
        description: 'Prepare swap transactions (wrap NEAR, approve, swap)',
        order: 4,
      },
      {
        type: 'execute_swap',
        description: 'Sign and execute swap transaction on NEAR testnet',
        order: 5,
      },
    ];
  }
}
