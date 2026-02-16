"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { parseNearAmount } from "@/lib/near/utils";
import { getNearConfig } from "@/lib/near/config";
import type { ChatMessage } from "@/lib/types";

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
  minimumOutput: string;
  fromTokenId: string;
  toTokenId: string;
  amountInSmallestUnit: string;
  minimumOutputInSmallestUnit: string;
  needsWrapping?: boolean;
}

interface WrapRequest {
  id: string;
  type: "wrap";
  amount: string;
  amountInYocto: string;
  contractId: string;
}

interface UnwrapRequest {
  id: string;
  type: "unwrap";
  amount: string;
  amountInYocto: string;
  contractId: string;
}

interface BalanceRequest {
  id: string;
}

export function useNearTransactions(
  dataStream: Array<any> | null,
  sendMessage: (message: any) => void
) {
  const { accountId, balance, isConnected, signAndSendTransaction } =
    useWallet();

  const [pendingTransaction, setPendingTransaction] =
    useState<TransactionRequest | null>(null);
  const [pendingSwap, setPendingSwap] = useState<SwapRequest | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Use refs to track processed IDs to avoid stale closures
  const processedTransactionIdsRef = useRef<Set<string>>(new Set());
  const processedSwapIdsRef = useRef<Set<string>>(new Set());
  const executingTransactionRef = useRef<boolean>(false);
  const executingSwapRef = useRef<boolean>(false);

  // Handle balance requests
  useEffect(() => {
    if (!dataStream) return;

    const balanceRequests = dataStream.filter(
      (part) => part.type === "data-nearBalanceRequest"
    ) as Array<{ type: "data-nearBalanceRequest"; data: BalanceRequest }>;

    if (balanceRequests.length === 0) return;

    console.log("🔵 NEAR: Balance request detected", balanceRequests);

    // Get the latest balance request
    const latestRequest = balanceRequests[balanceRequests.length - 1];

    if (!isConnected || !accountId) {
      console.log("🔵 NEAR: Wallet not connected");
      sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: "Please connect your NEAR wallet first to check your balance.",
          },
        ],
      });
      return;
    }

    // Get network config for explorer URL
    const nearConfig = getNearConfig();
    const explorerUrl = `${nearConfig.explorerUrl}/address/${accountId}`;

    // Send balance information back to the AI
    console.log("🔵 NEAR: Sending balance info", { balance, accountId, explorerUrl });
    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: `My connected wallet: ${accountId}\nBalance: ${balance || "0"} NEAR\nExplorer: ${explorerUrl}`,
        },
      ],
    });
  }, [dataStream, isConnected, balance, accountId, sendMessage]);

  // Handle transaction requests - automatically execute via wallet provider
  useEffect(() => {
    if (!dataStream) return;

    const transactionRequests = dataStream.filter(
      (part) => part.type === "data-nearTransactionRequest"
    ) as Array<{
      type: "data-nearTransactionRequest";
      data: TransactionRequest;
    }>;

    if (transactionRequests.length === 0) return;

    // Get the latest transaction request
    const latestRequest = transactionRequests[transactionRequests.length - 1];
    const transaction = latestRequest.data;

    // Check if we already processed this transaction or if one is currently executing
    if (processedTransactionIdsRef.current.has(transaction.id)) {
      console.log("🔵 NEAR: Transaction already processed", transaction.id);
      return;
    }

    if (executingTransactionRef.current) {
      console.log("🔵 NEAR: Transaction already executing, skipping");
      return;
    }

    console.log("🔵 NEAR: Processing new transaction request", transaction.id);

    // Mark as processed immediately to prevent double execution
    processedTransactionIdsRef.current.add(transaction.id);
    executingTransactionRef.current = true;
    
    // Set pending transaction and immediately call wallet provider
    setPendingTransaction(transaction);
    setShowConfirmation(true);

    // Automatically trigger wallet provider
    // The wallet extension will show its own confirmation UI
    executeTransactionViaWallet(transaction);
  }, [dataStream]);

  // Handle swap requests - automatically execute via wallet provider
  useEffect(() => {
    if (!dataStream) return;

    const swapRequests = dataStream.filter(
      (part) => part.type === "data-nearSwapRequest"
    ) as Array<{
      type: "data-nearSwapRequest";
      data: SwapRequest;
    }>;

    if (swapRequests.length === 0) return;

    // Get the latest swap request
    const latestRequest = swapRequests[swapRequests.length - 1];
    const swap = latestRequest.data;

    // Check if we already processed this swap or if one is currently executing
    if (processedSwapIdsRef.current.has(swap.id)) {
      console.log("🔵 NEAR SWAP: Swap already processed", swap.id);
      return;
    }

    if (executingSwapRef.current) {
      console.log("🔵 NEAR SWAP: Swap already executing, skipping");
      return;
    }

    console.log("🔵 NEAR SWAP: Processing new swap request", swap.id);

    // Mark as processed immediately to prevent double execution
    processedSwapIdsRef.current.add(swap.id);
    executingSwapRef.current = true;
    
    // Set pending swap and immediately call wallet provider
    setPendingSwap(swap);
    setShowConfirmation(true);

    // Automatically trigger wallet provider
    executeSwapViaWallet(swap);
  }, [dataStream]);

  // Execute transaction via wallet provider
  const executeTransactionViaWallet = useCallback(
    async (transaction: TransactionRequest) => {
      if (!isConnected) {
        console.log("🔵 NEAR: Wallet not connected");
        setShowConfirmation(false);
        setPendingTransaction(null);
        return;
      }

      try {
        console.log("🔵 NEAR: Calling wallet provider for transaction");
        
        // Call wallet provider - it will show its own confirmation UI
        const result = await signAndSendTransaction({
          receiverId: transaction.recipient,
          actions: [
            {
              type: "Transfer",
              params: {
                deposit: transaction.amountInYocto,
              },
            },
          ],
        });

        // Log the full result to see its structure
        console.log("🔵 NEAR: Transaction result", result);
        
        // Extract transaction hash - wallet-selector returns different formats
        // It could be result.transaction.hash or result[0].transaction.hash
        let txHash: string | undefined;
        if (Array.isArray(result) && result[0]?.transaction?.hash) {
          txHash = result[0].transaction.hash;
        } else if ((result as any)?.transaction?.hash) {
          txHash = (result as any).transaction.hash;
        }
        
        console.log("🔵 NEAR: Transaction hash", txHash);
        
        // Transaction successful - send a user message with the transaction details
        setShowConfirmation(false);
        setPendingTransaction(null);
        executingTransactionRef.current = false;
        
        if (txHash) {
          // Get the network config to build the explorer URL
          const nearConfig = getNearConfig();
          const explorerUrl = `${nearConfig.explorerUrl}/txns/${txHash}`;
          
          // Send a simple user confirmation, then let the agent provide details
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Transaction confirmed. Hash: ${txHash}`,
              },
            ],
          });
        } else {
          // Fallback if we can't extract the hash
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Transaction confirmed.`,
              },
            ],
          });
        }
      } catch (error) {
        console.log("🔵 NEAR: Transaction failed or rejected", error);
        
        // User rejected in wallet or transaction failed
        setShowConfirmation(false);
        setPendingTransaction(null);
        executingTransactionRef.current = false;
        
        // Optionally send a user message to inform about failure
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        });
      }
    },
    [isConnected, signAndSendTransaction, sendMessage]
  );

  // Execute swap via wallet provider
  const executeSwapViaWallet = useCallback(
    async (swap: SwapRequest) => {
      if (!isConnected) {
        console.log("🔵 NEAR SWAP: Wallet not connected");
        setShowConfirmation(false);
        setPendingSwap(null);
        return;
      }

      try {
        console.log("🔵 NEAR SWAP: Generating swap transaction");
        
        const { generateSwapTransaction } = await import("@/lib/ref-finance/swap");
        const nearConfig = getNearConfig();
        
        // Generate swap transaction (pass accountId to check registration)
        const transaction = await generateSwapTransaction(
          swap.fromTokenId,
          swap.amountInSmallestUnit,
          swap.toTokenId,
          swap.minimumOutputInSmallestUnit,
          nearConfig.networkId,
          accountId || undefined,
          swap.needsWrapping
        );
        
        console.log("🔵 NEAR SWAP: Calling wallet provider for swap");
        
        // Call wallet provider with the swap transaction
        const result = await signAndSendTransaction(transaction);

        // Log the full result
        console.log("🔵 NEAR SWAP: Swap result", result);
        
        // Extract transaction hash
        let txHash: string | undefined;
        if (Array.isArray(result) && result[0]?.transaction?.hash) {
          txHash = result[0].transaction.hash;
        } else if ((result as any)?.transaction?.hash) {
          txHash = (result as any).transaction.hash;
        }
        
        console.log("🔵 NEAR SWAP: Transaction hash", txHash);
        
        // Swap successful
        setShowConfirmation(false);
        setPendingSwap(null);
        executingSwapRef.current = false;
        
        if (txHash) {
          // Get the network config to build the explorer URL
          const nearConfig = getNearConfig();
          const explorerUrl = `${nearConfig.explorerUrl}/txns/${txHash}`;
          
          // Send confirmation with transaction details
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Swap confirmed. Hash: ${txHash}`,
              },
            ],
          });
        } else {
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Swap confirmed.`,
              },
            ],
          });
        }
      } catch (error) {
        console.log("🔵 NEAR SWAP: Swap failed or rejected", error);
        
        // User rejected or swap failed
        setShowConfirmation(false);
        setPendingSwap(null);
        executingSwapRef.current = false;
        
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Swap failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        });
      }
    },
    [isConnected, signAndSendTransaction, sendMessage]
  );

  // This is no longer needed - wallet provider handles everything
  const executeTransaction = useCallback(async () => {
    // Wallet provider is already handling the transaction
    // This function is kept for compatibility but does nothing
  }, []);

  // Cancel transaction
  const cancelTransaction = useCallback(() => {
    if (!pendingTransaction) return;

    // Send cancellation response back to the AI
    sendMessage({
      role: "tool" as const,
      parts: [
        {
          type: "tool-result",
          toolCallId: pendingTransaction.id,
          toolName: "sendNearTokens",
          result: {
            success: false,
            error: "Transaction cancelled by user",
            cancelled: true,
          },
        },
      ],
    });

    setShowConfirmation(false);
    setPendingTransaction(null);
  }, [pendingTransaction, sendMessage]);

  // Handle wrap requests
  useEffect(() => {
    if (!dataStream) return;

    const wrapRequests = dataStream.filter(
      (part) => part.type === "data-nearWrapRequest"
    ) as Array<{
      type: "data-nearWrapRequest";
      data: WrapRequest;
    }>;

    if (wrapRequests.length === 0) return;

    const latestRequest = wrapRequests[wrapRequests.length - 1];
    const wrapReq = latestRequest.data;

    console.log("🔵 NEAR WRAP: Processing wrap request", wrapReq.id);

    if (!isConnected) {
      console.log("🔵 NEAR WRAP: Wallet not connected");
      return;
    }

    // Execute wrap transaction
    (async () => {
      try {
        console.log("🔵 NEAR WRAP: Wrapping", wrapReq.amount, "NEAR");

        // Wrap NEAR by calling near_deposit on wNEAR contract with attached NEAR
        const result = await signAndSendTransaction({
          receiverId: wrapReq.contractId,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "near_deposit",
                args: {},
                gas: "30000000000000", // 30 TGas
                deposit: wrapReq.amountInYocto, // Attach the NEAR to wrap
              },
            },
          ],
        });

        console.log("🔵 NEAR WRAP: Wrap result", result);

        // Extract transaction hash
        let txHash: string | undefined;
        if (Array.isArray(result) && result[0]?.transaction?.hash) {
          txHash = result[0].transaction.hash;
        } else if ((result as any)?.transaction?.hash) {
          txHash = (result as any).transaction.hash;
        }

        if (txHash) {
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Successfully wrapped ${wrapReq.amount} NEAR into wNEAR. Hash: ${txHash}`,
              },
            ],
          });
        } else {
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Successfully wrapped ${wrapReq.amount} NEAR into wNEAR.`,
              },
            ],
          });
        }
      } catch (error) {
        console.log("🔵 NEAR WRAP: Wrap failed or rejected", error);

        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Wrap failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        });
      }
    })();
  }, [dataStream, isConnected, signAndSendTransaction, sendMessage]);

  // Handle unwrap requests
  useEffect(() => {
    if (!dataStream) return;

    const unwrapRequests = dataStream.filter(
      (part) => part.type === "data-nearUnwrapRequest"
    ) as Array<{
      type: "data-nearUnwrapRequest";
      data: UnwrapRequest;
    }>;

    if (unwrapRequests.length === 0) return;

    const latestRequest = unwrapRequests[unwrapRequests.length - 1];
    const unwrapReq = latestRequest.data;

    console.log("🔵 NEAR UNWRAP: Processing unwrap request", unwrapReq.id);

    if (!isConnected) {
      console.log("🔵 NEAR UNWRAP: Wallet not connected");
      return;
    }

    // Execute unwrap transaction
    (async () => {
      try {
        console.log("🔵 NEAR UNWRAP: Unwrapping", unwrapReq.amount, "wNEAR");

        // Unwrap wNEAR by calling near_withdraw on wNEAR contract
        const result = await signAndSendTransaction({
          receiverId: unwrapReq.contractId,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "near_withdraw",
                args: {
                  amount: unwrapReq.amountInYocto,
                },
                gas: "30000000000000", // 30 TGas
                deposit: "1", // 1 yoctoNEAR for security
              },
            },
          ],
        });

        console.log("🔵 NEAR UNWRAP: Unwrap result", result);

        // Extract transaction hash
        let txHash: string | undefined;
        if (Array.isArray(result) && result[0]?.transaction?.hash) {
          txHash = result[0].transaction.hash;
        } else if ((result as any)?.transaction?.hash) {
          txHash = (result as any).transaction.hash;
        }

        if (txHash) {
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Successfully unwrapped ${unwrapReq.amount} wNEAR back to NEAR. Hash: ${txHash}`,
              },
            ],
          });
        } else {
          sendMessage({
            role: "user",
            parts: [
              {
                type: "text",
                text: `Successfully unwrapped ${unwrapReq.amount} wNEAR back to NEAR.`,
              },
            ],
          });
        }
      } catch (error) {
        console.log("🔵 NEAR UNWRAP: Unwrap failed or rejected", error);

        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `Unwrap failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        });
      }
    })();
  }, [dataStream, isConnected, signAndSendTransaction, sendMessage]);

  return {
    pendingTransaction,
    pendingSwap,
    showConfirmation,
    executeTransaction,
    cancelTransaction,
  };
}

