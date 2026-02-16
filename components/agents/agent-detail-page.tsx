"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskHistory } from "./task-history";
import { ExecutionConfirmationDialog } from "./execution-confirmation-dialog";
import { ExecutionResultDialog } from "./execution-result-dialog";
import type { Agent } from "./agent-dashboard";

interface AgentDetailPageProps {
  agentId: string;
}

interface Task {
  id: string;
  taskType: string;
  taskDescription: string;
  taskInput: any;
  taskOutput: any;
  status: "pending" | "running" | "completed" | "failed";
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export function AgentDetailPage({ agentId }: AgentDetailPageProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit description state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message: string;
    taskCount?: number;
  }>({ success: false, message: "" });

  // Clear tasks state
  const [clearingTasks, setClearingTasks] = useState(false);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Agent not found");
        }
        throw new Error("Failed to fetch agent");
      }

      const data = await response.json();
      setAgent(data.agent);
      setEditedDescription(data.agent.description || "");

      fetchBalance();
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const response = await fetch(`/api/agents/${agentId}/balance`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance("0");
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const handleSaveDescription = async () => {
    try {
      setSavingDescription(true);

      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      });

      if (!response.ok) {
        throw new Error("Failed to update description");
      }

      const data = await response.json();
      setAgent(data.agent);
      setIsEditingDescription(false);
    } catch (err) {
      alert("Failed to save description");
    } finally {
      setSavingDescription(false);
    }
  };

  const handleExecuteAgent = async () => {
    setShowConfirmDialog(false);

    try {
      setExecuting(true);

      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || "Failed to execute agent");
      }

      const data = await response.json();

      setExecutionResult({
        success: true,
        message: "Agent execution started successfully",
        taskCount: data.taskIds.length,
      });
      setShowResultDialog(true);

      // Refresh tasks
      fetchTasks();
    } catch (err) {
      setExecutionResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to execute agent",
      });
      setShowResultDialog(true);
    } finally {
      setExecuting(false);
    }
  };

  const handleClearTasks = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all task history? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setClearingTasks(true);

      const response = await fetch(`/api/agents/${agentId}/tasks`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || "Failed to clear tasks");
      }

      // Refresh tasks to show empty list
      await fetchTasks();

      alert("Task history cleared successfully");
    } catch (err) {
      alert(
        `Failed to clear tasks: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setClearingTasks(false);
    }
  };

  useEffect(() => {
    fetchAgent();

    // Poll for task updates every 5 seconds
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const formatBalance = (bal: string | null) => {
    if (!bal) return "0 NEAR";
    const num = parseFloat(bal);
    if (isNaN(num)) return "0 NEAR";
    return `${num} NEAR`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#f3f3f2]">
        <div className="border-b border-gray-200 bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col h-screen bg-[#f3f3f2]">
        <div className="border-b border-gray-200 bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="outline"
              onClick={() => router.push("/agents")}
              className="bg-white text-gray-800 hover:bg-gray-100"
            >
              ← Back to Agents
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              {error || "Agent not found"}
            </h2>
            <Button
              onClick={() => router.push("/agents")}
              className="bg-black px-3 text-white hover:bg-gray-800"
            >
              Go to Agents Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f3f3f2]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/agents")}
                className="bg-white text-gray-800 hover:bg-gray-100"
              >
                ← Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {agent.name}
                </h1>
                <p className="text-sm text-gray-600">{agent.accountId}</p>
              </div>
              <Badge
                variant={agent.status === "active" ? "default" : "secondary"}
                className={
                  agent.status === "active"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-800"
                }
              >
                {agent.status}
              </Badge>
            </div>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={executing || agent.status !== "active"}
              size="lg"
              className="bg-black px-3 text-white hover:bg-gray-800"
            >
              {executing ? "Executing..." : "Execute Agent"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Agent Info Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-800">Agent Information</CardTitle>
              <CardDescription className="text-gray-600">
                Basic details about this autonomous agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description - Editable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-800">
                    Description
                  </label>
                  {!isEditingDescription ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDescription(true)}
                      className="text-gray-800 hover:bg-gray-100"
                    >
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingDescription(false);
                          setEditedDescription(agent.description || "");
                        }}
                        disabled={savingDescription}
                        className="text-gray-800 hover:bg-gray-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveDescription}
                        disabled={savingDescription}
                        className="bg-black px-3 text-white hover:bg-gray-800"
                      >
                        {savingDescription ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
                {!isEditingDescription ? (
                  <p className="text-sm text-gray-600">
                    {agent.description || "No description"}
                  </p>
                ) : (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe what this agent should do..."
                    className="bg-white text-gray-800"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Account ID
                  </label>
                  <a
                    href={`https://testnet.nearblocks.io/address/${agent.accountId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 font-mono block hover:underline"
                  >
                    {agent.accountId}
                  </a>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Balance
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600">
                      {balanceLoading ? "Loading..." : formatBalance(balance)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchBalance}
                      disabled={balanceLoading}
                      className="h-6 px-2 text-gray-800 hover:bg-gray-100"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Created
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(agent.createdAt)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(agent.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Task History
                </h2>
                <p className="text-sm text-gray-600">
                  Execution history of agent tasks
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTasks}
                  className="bg-white text-gray-800 hover:bg-gray-100"
                >
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearTasks}
                  disabled={clearingTasks || tasks.length === 0}
                  className="bg-white text-gray-800 hover:bg-gray-100"
                >
                  {clearingTasks ? "Clearing..." : "Clear History"}
                </Button>
              </div>
            </div>
            <TaskHistory tasks={tasks} onRefresh={fetchTasks} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ExecutionConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleExecuteAgent}
        agentName={agent.name}
      />

      <ExecutionResultDialog
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
        success={executionResult.success}
        message={executionResult.message}
        taskCount={executionResult.taskCount}
      />
    </div>
  );
}
