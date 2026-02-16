"use client";

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

interface ExecutionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  agentName: string;
}

export function ExecutionConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  agentName,
}: ExecutionConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-gray-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-800">
            Execute Agent?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-gray-600">
              <p>
                This will start the autonomous execution of{" "}
                <strong className="text-gray-800">{agentName}</strong>. The
                agent will:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Analyze available tokens on Ref Finance</li>
                <li>Use AI to predict the best investment</li>
                <li>Execute a token swap on NEAR testnet</li>
              </ul>
              <p className="mt-3 text-sm">
                This action will use the agent's NEAR balance to perform
                transactions.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white text-gray-800 hover:bg-gray-100">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-black px-3 text-white hover:bg-gray-800"
          >
            Execute Agent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
