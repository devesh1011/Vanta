import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { agent, type Agent } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptPrivateKey, decryptPrivateKey } from './encryption';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface CreateAgentData {
  name: string;
  description?: string;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  status?: 'active' | 'paused' | 'deleted';
  balance?: string;
}

export interface AgentWithDecryptedKey extends Agent {
  decryptedPrivateKey: string;
}

export class AgentService {
  /**
   * Creates a new agent in the database
   * @param userId The user ID who owns the agent
   * @param accountId The NEAR account ID for the agent
   * @param publicKey The public key for the NEAR account
   * @param privateKey The private key for the NEAR account (will be encrypted)
   * @param data Agent creation data (name, description)
   * @returns The created agent
   */
  async createAgent(
    userId: string,
    accountId: string,
    publicKey: string,
    privateKey: string,
    data: CreateAgentData
  ): Promise<Agent> {
    const encryptedPrivateKey = encryptPrivateKey(privateKey);

    const [newAgent] = await db
      .insert(agent)
      .values({
        userId,
        accountId,
        publicKey,
        encryptedPrivateKey,
        name: data.name,
        description: data.description,
        balance: '0',
        status: 'active',
      })
      .returning();

    return newAgent;
  }

  /**
   * Lists all agents for a user
   * @param userId The user ID
   * @returns Array of agents
   */
  async listAgents(userId: string): Promise<Agent[]> {
    const agents = await db
      .select()
      .from(agent)
      .where(
        and(
          eq(agent.userId, userId),
          eq(agent.status, 'active')
        )
      )
      .orderBy(agent.createdAt);

    return agents;
  }

  /**
   * Gets a single agent by ID
   * @param agentId The agent ID
   * @param userId The user ID (for authorization)
   * @returns The agent or null if not found
   */
  async getAgent(agentId: string, userId: string): Promise<Agent | null> {
    const [foundAgent] = await db
      .select()
      .from(agent)
      .where(
        and(
          eq(agent.id, agentId),
          eq(agent.userId, userId)
        )
      )
      .limit(1);

    return foundAgent || null;
  }

  /**
   * Gets an agent with its decrypted private key
   * @param agentId The agent ID
   * @param userId The user ID (for authorization)
   * @returns The agent with decrypted private key or null if not found
   */
  async getAgentWithPrivateKey(
    agentId: string,
    userId: string
  ): Promise<AgentWithDecryptedKey | null> {
    const foundAgent = await this.getAgent(agentId, userId);
    
    if (!foundAgent) {
      return null;
    }

    const decryptedPrivateKey = decryptPrivateKey(foundAgent.encryptedPrivateKey);

    return {
      ...foundAgent,
      decryptedPrivateKey,
    };
  }

  /**
   * Updates an agent
   * @param agentId The agent ID
   * @param userId The user ID (for authorization)
   * @param data Update data
   * @returns The updated agent or null if not found
   */
  async updateAgent(
    agentId: string,
    userId: string,
    data: UpdateAgentData
  ): Promise<Agent | null> {
    const [updatedAgent] = await db
      .update(agent)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agent.id, agentId),
          eq(agent.userId, userId)
        )
      )
      .returning();

    return updatedAgent || null;
  }

  /**
   * Deletes an agent (soft delete by setting status to 'deleted')
   * @param agentId The agent ID
   * @param userId The user ID (for authorization)
   * @returns True if deleted, false if not found
   */
  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    const result = await this.updateAgent(agentId, userId, {
      status: 'deleted',
    });

    return result !== null;
  }

  /**
   * Updates an agent's balance
   * @param agentId The agent ID
   * @param balance The new balance
   */
  async updateBalance(agentId: string, balance: string): Promise<void> {
    await db
      .update(agent)
      .set({
        balance,
        updatedAt: new Date(),
      })
      .where(eq(agent.id, agentId));
  }

  /**
   * Gets all active agents (for background job execution)
   * @returns Array of all active agents
   */
  async getAllActiveAgents(): Promise<Agent[]> {
    const agents = await db
      .select()
      .from(agent)
      .where(eq(agent.status, 'active'))
      .orderBy(agent.createdAt);

    return agents;
  }
}

// Export singleton instance
export const agentService = new AgentService();
