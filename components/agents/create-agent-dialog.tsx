"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Agent } from "./agent-dashboard";

interface CreateAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agent: Agent) => void;
}

export function CreateAgentDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Agent name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create agent");
      }

      const data = await response.json();
      onSuccess(data.agent);

      // Reset form
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName("");
      setDescription("");
      setError(null);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-white border-gray-200">
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800">
              Create New Agent
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Create an autonomous trading agent with its own NEAR testnet
              account. This may take a few moments.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-800">
                Agent Name *
              </Label>
              <Input
                id="name"
                placeholder="My Trading Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                maxLength={255}
                required
                className="bg-white text-gray-800 border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-800">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent will do..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
                className="bg-white text-gray-800 border-gray-200"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded">
                Creating agent and NEAR account... This may take up to 30
                seconds.
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="bg-white text-gray-800 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-black px-3 text-white hover:bg-gray-800"
            >
              {loading ? "Creating..." : "Create Agent"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
