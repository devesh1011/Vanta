"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoaderIcon } from "./icons";
import { getNearConfig } from "@/lib/near/config";

interface TransactionRequest {
  id: string;
  type: "transfer";
  recipient: string;
  amount: string;
  amountInYocto: string;
  memo?: string;
}

interface SwapRequest {
  id: string;
  type: "swap";
  fromToken: string;
  toToken: string;
  amount: string;
  fromTokenId: string;
  toTokenId: string;
  amountInSmallestUnit: string;
}

interface TransactionConfirmationDialogProps {
  isOpen: boolean;
  transaction: TransactionRequest | SwapRequest | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function TransactionConfirmationDialog({
  isOpen,
  transaction,
  onConfirm,
  onCancel,
}: TransactionConfirmationDialogProps) {
  const nearConfig = getNearConfig();

  if (!transaction) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Wallet Confirmation Required</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin">
                  <LoaderIcon size={32} />
                </div>
              </div>

              <div className="space-y-2">
                {transaction.type === "transfer" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-mono font-medium">
                        {transaction.recipient}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">{transaction.amount} NEAR</span>
                    </div>
                    {transaction.memo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Memo:</span>
                        <span className="font-medium">{transaction.memo}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Swap:</span>
                      <span className="font-medium">
                        {transaction.amount} {transaction.fromToken} → {transaction.toToken}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">Token Swap</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Slippage:</span>
                      <span className="font-medium">1%</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium capitalize">
                    {nearConfig.networkId}
                  </span>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Please confirm in your wallet
                </div>
                <div className="mt-1 text-blue-700 dark:text-blue-300">
                  Your wallet extension will open to confirm this transaction.
                  Please review and approve it there.
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
