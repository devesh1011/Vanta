"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle } from "lucide-react";

interface ExecutionResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  success: boolean;
  message: string;
  taskCount?: number;
}

export function ExecutionResultDialog({
  open,
  onOpenChange,
  success,
  message,
  taskCount,
}: ExecutionResultDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-gray-200">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <AlertDialogTitle className="text-gray-800">
              {success ? "Execution Started" : "Execution Failed"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600">
            {success ? (
              <div className="space-y-2">
                <p>Agent execution has been started successfully!</p>
                {taskCount && (
                  <p className="font-medium text-gray-800">
                    {taskCount} task{taskCount !== 1 ? "s" : ""} created and
                    running.
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-3">
                  You can monitor the progress in the Task History section
                  below.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>Failed to execute the agent:</p>
                <p className="font-mono text-sm bg-gray-100 text-gray-800 p-2 rounded">
                  {message}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-black px-3 text-white hover:bg-gray-800">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
