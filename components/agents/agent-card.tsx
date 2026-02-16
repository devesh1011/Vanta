"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Agent } from "./agent-dashboard";

interface AgentCardProps {
  agent: Agent;
  onDeleted: (agentId: string) => void;
  onUpdated: (agent: Agent) => void;
}

export function AgentCard({ agent, onDeleted, onUpdated }: AgentCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Fetch balance on mount
  React.useEffect(() => {
    fetchBalance();
  }, [agent.id]);

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const response = await fetch(`/api/agents/${agent.id}/balance`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      setLoading(true);
      const newStatus = agent.status === "active" ? "paused" : "active";

      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update agent");
      }

      const data = await response.json();
      onUpdated(data.agent);
    } catch (err) {
      console.error("Error updating agent:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      onDeleted(agent.id);
    } catch (err) {
      console.error("Error deleting agent:", err);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleViewDetails = () => {
    router.push(`/agents/${agent.id}`);
  };

  const formatBalance = (bal: string | null) => {
    if (!bal) return "0 NEAR";
    const num = parseFloat(bal);
    if (isNaN(num)) return "0 NEAR";
    return `${num} NEAR`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <Card className="bg-white hover:shadow-lg transition-shadow border-gray-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg text-gray-800">
                {agent.name}
              </CardTitle>
              <CardDescription className="text-xs mt-1 text-gray-600">
                {agent.accountId}
              </CardDescription>
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
        </CardHeader>

        <CardContent>
          {agent.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {agent.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Balance:</span>
              <span className="font-medium text-gray-800">
                {balanceLoading ? "Loading..." : formatBalance(balance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="text-gray-800">
                {formatDate(agent.createdAt)}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="flex-1 bg-white text-gray-800 hover:bg-gray-100"
          >
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePauseResume}
            disabled={loading}
            className="bg-white text-gray-800 hover:bg-gray-100"
          >
            {agent.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
            className="bg-white text-red-500 hover:bg-red-50 border-red-200"
          >
            Delete
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agent.name}"? This action cannot
              be undone. The agent's NEAR account will remain, but you will lose
              access to it through this interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
