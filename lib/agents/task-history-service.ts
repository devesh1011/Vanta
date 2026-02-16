import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { agentTaskHistory, type AgentTaskHistory } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export interface CreateTaskData {
  agentId: string;
  taskType: string;
  taskDescription: string;
  taskInput?: any;
}

export interface UpdateTaskData {
  taskOutput?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage?: string;
  completedAt?: Date;
}

export class TaskHistoryService {
  /**
   * Creates a new task in history
   */
  async createTask(data: CreateTaskData): Promise<AgentTaskHistory> {
    const [task] = await db
      .insert(agentTaskHistory)
      .values({
        agentId: data.agentId,
        taskType: data.taskType,
        taskDescription: data.taskDescription,
        taskInput: data.taskInput || null,
        status: 'pending',
        startedAt: new Date(),
      })
      .returning();

    return task;
  }

  /**
   * Updates a task's status and output
   */
  async updateTask(
    taskId: string,
    data: UpdateTaskData
  ): Promise<AgentTaskHistory | null> {
    const [updated] = await db
      .update(agentTaskHistory)
      .set({
        ...data,
        taskOutput: data.taskOutput || null,
        errorMessage: data.errorMessage || null,
        completedAt: data.completedAt || (data.status === 'completed' || data.status === 'failed' ? new Date() : null),
      })
      .where(eq(agentTaskHistory.id, taskId))
      .returning();

    return updated || null;
  }

  /**
   * Gets all tasks for an agent
   */
  async getAgentTasks(agentId: string, limit = 50): Promise<AgentTaskHistory[]> {
    const tasks = await db
      .select()
      .from(agentTaskHistory)
      .where(eq(agentTaskHistory.agentId, agentId))
      .orderBy(desc(agentTaskHistory.createdAt))
      .limit(limit);

    return tasks;
  }

  /**
   * Gets a specific task by ID
   */
  async getTask(taskId: string): Promise<AgentTaskHistory | null> {
    const [task] = await db
      .select()
      .from(agentTaskHistory)
      .where(eq(agentTaskHistory.id, taskId))
      .limit(1);

    return task || null;
  }

  /**
   * Gets recent tasks for an agent with a specific status
   */
  async getTasksByStatus(
    agentId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    limit = 10
  ): Promise<AgentTaskHistory[]> {
    const tasks = await db
      .select()
      .from(agentTaskHistory)
      .where(
        and(
          eq(agentTaskHistory.agentId, agentId),
          eq(agentTaskHistory.status, status)
        )
      )
      .orderBy(desc(agentTaskHistory.createdAt))
      .limit(limit);

    return tasks;
  }
}

// Export singleton instance
export const taskHistoryService = new TaskHistoryService();
