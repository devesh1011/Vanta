"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface TaskHistoryProps {
  tasks: Task[];
  onRefresh?: () => void;
}

export function TaskHistory({ tasks, onRefresh }: TaskHistoryProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "default";
      case "running":
        return "secondary";
      case "failed":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTaskType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (tasks.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800">Task History</CardTitle>
          <CardDescription className="text-gray-600">
            Execution history of agent tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center py-8">
            No tasks executed yet. Click "Execute Agent" to start.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-800">Task History</CardTitle>
            <CardDescription className="text-gray-600">
              Execution history of agent tasks
            </CardDescription>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="bg-white text-gray-800 hover:bg-gray-100"
            >
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <Collapsible
              key={task.id}
              open={expandedTasks.has(task.id)}
              onOpenChange={() => toggleTask(task.id)}
            >
              <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={getStatusColor(task.status)}
                          className={
                            task.status === "completed"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : task.status === "running"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : task.status === "failed"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                        >
                          {task.status}
                        </Badge>
                        <span className="text-sm font-medium text-gray-800">
                          {formatTaskType(task.taskType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {task.taskDescription}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(task.startedAt)}
                      </p>
                    </div>
                    <span className="text-gray-600">
                      {expandedTasks.has(task.id) ? "▼" : "▶"}
                    </span>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {task.taskInput && (
                      <div>
                        <label className="text-xs font-medium text-gray-800">
                          Input:
                        </label>
                        <pre className="text-xs bg-gray-100 text-gray-800 p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(task.taskInput, null, 2)}
                        </pre>
                      </div>
                    )}

                    {task.taskOutput && (
                      <div>
                        <label className="text-xs font-medium text-gray-800">
                          Output:
                        </label>
                        <pre className="text-xs bg-gray-100 text-gray-800 p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(task.taskOutput, null, 2)}
                        </pre>
                      </div>
                    )}

                    {task.errorMessage && (
                      <div>
                        <label className="text-xs font-medium text-red-500">
                          Error:
                        </label>
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded mt-1">
                          {task.errorMessage}
                        </p>
                      </div>
                    )}

                    {task.completedAt && (
                      <div className="text-xs text-gray-600">
                        Completed: {formatDate(task.completedAt)}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
