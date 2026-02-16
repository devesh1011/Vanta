"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AgentCard } from "./agent-card";
import { CreateAgentDialog } from "./create-agent-dialog";
import { PlusIcon } from "@/components/icons";

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  accountId: string;
  balance: string;
  status: "active" | "paused" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

export function AgentDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/agents");

      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data = await response.json();
      setAgents(data.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleAgentCreated = (agent: Agent) => {
    setAgents((prev) => [agent, ...prev]);
    setIsCreateDialogOpen(false);
  };

  const handleAgentDeleted = (agentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
  };

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)),
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f3f3f2]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Autonomous Agents
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Create and manage AI-powered trading agents
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="bg-white text-gray-800 hover:bg-gray-100"
              >
                Chat
              </Button>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-black px-3 text-white hover:bg-gray-800"
              >
                <PlusIcon />
                <span className="ml-2">Create Agent</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading agents...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Button
                variant="outline"
                onClick={fetchAgents}
                className="mt-4 bg-white text-gray-800 hover:bg-gray-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && agents.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                No agents yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first autonomous trading agent to get started
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-black px-3 text-white hover:bg-gray-800"
              >
                <PlusIcon />
                <span className="ml-2">Create Your First Agent</span>
              </Button>
            </div>
          )}

          {!loading && !error && agents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onDeleted={handleAgentDeleted}
                  onUpdated={handleAgentUpdated}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleAgentCreated}
      />
    </div>
  );
}
