"use client";

/**
 * NEAR Wallet Context Provider
 *
 * This context manages wallet connection state and provides wallet functionality
 * throughout the application. It handles wallet initialization, connection,
 * disconnection, balance fetching, and transaction signing.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";

import { getNearConfig } from "./config";
import type { WalletContextValue, Transaction } from "./types";
import type { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { formatNearAmount } from "./utils";

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const WALLET_STORAGE_KEY = "near_wallet_account_id";

// Safe localStorage helpers for SSR compatibility
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("localStorage.setItem failed:", error);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("localStorage.removeItem failed:", error);
    }
  },
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWallet] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const nearConfig = getNearConfig();

  /**
   * Initialize wallet selector on mount
   */
  useEffect(() => {
    const initWallet = async () => {
      try {
        // Dynamically import wallet modules and styles to avoid SSR issues
        const [
          { setupWalletSelector },
          { setupModal },
          { setupMyNearWallet },
          { setupMeteorWallet },
          { setupSender },
        ] = await Promise.all([
          import("@near-wallet-selector/core"),
          import("@near-wallet-selector/modal-ui"),
          import("@near-wallet-selector/my-near-wallet"),
          import("@near-wallet-selector/meteor-wallet"),
          import("@near-wallet-selector/sender"),
        ]);

        // Import styles dynamically
        // @ts-expect-error CSS import lacks type declarations
        await import("@near-wallet-selector/modal-ui/styles.css");

        const selector = await setupWalletSelector({
          network: nearConfig.networkId,
          modules: [setupMyNearWallet(), setupMeteorWallet(), setupSender()],
        });

        const walletSelectorModal = setupModal(selector, {
          contractId: "", // Optional: only needed for function call access
          description:
            "Connect your NEAR wallet to interact with the application",
        });

        setWallet(selector);
        setModal(walletSelectorModal);

        // Check for persisted wallet connection
        const persistedAccountId = safeLocalStorage.getItem(WALLET_STORAGE_KEY);
        if (persistedAccountId) {
          const accounts = selector.store.getState().accounts;
          const account = accounts.find(
            (acc) => acc.accountId === persistedAccountId,
          );

          if (account) {
            setAccountId(account.accountId);
            setIsConnected(true);
            // Fetch balance for persisted account
            await fetchBalance(account.accountId);
          } else {
            // Clear invalid persisted state
            safeLocalStorage.removeItem(WALLET_STORAGE_KEY);
          }
        }

        // Subscribe to wallet state changes
        const subscription = selector.store.observable.subscribe((state) => {
          const currentAccount = state.accounts[0];

          if (currentAccount) {
            setAccountId(currentAccount.accountId);
            setIsConnected(true);
            safeLocalStorage.setItem(
              WALLET_STORAGE_KEY,
              currentAccount.accountId,
            );
            fetchBalance(currentAccount.accountId);
          } else {
            setAccountId(null);
            setIsConnected(false);
            setBalance(null);
            safeLocalStorage.removeItem(WALLET_STORAGE_KEY);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Failed to initialize wallet selector:", error);
      }
    };

    initWallet();
  }, [nearConfig.networkId]);

  /**
   * Fetch account balance from blockchain
   */
  const fetchBalance = async (accountIdToFetch: string) => {
    try {
      const { providers } = await import("near-api-js");
      const provider = new providers.JsonRpcProvider({
        url: nearConfig.nodeUrl,
      });

      const account = (await provider.query({
        request_type: "view_account",
        finality: "final",
        account_id: accountIdToFetch,
      })) as any;

      if (account && "amount" in account) {
        const formattedBalance = formatNearAmount(account.amount);
        setBalance(formattedBalance);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
    }
  };

  /**
   * Connect to a wallet
   *
   * Opens the wallet selector modal for the user to choose a wallet provider.
   */
  const connect = useCallback(async () => {
    if (!modal) {
      throw new Error("Wallet selector modal not initialized");
    }

    try {
      modal.show();
    } catch (error) {
      console.error("Failed to show wallet selector modal:", error);
      throw error;
    }
  }, [modal]);

  /**
   * Disconnect from the current wallet
   */
  const disconnect = useCallback(async () => {
    if (!wallet) {
      return;
    }

    try {
      const selectedWallet = await wallet.wallet();
      if (selectedWallet) {
        await selectedWallet.signOut();
      }

      setAccountId(null);
      setIsConnected(false);
      setBalance(null);
      safeLocalStorage.removeItem(WALLET_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      throw error;
    }
  }, [wallet]);

  /**
   * Sign and send a transaction
   */
  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction | Transaction[],
    ): Promise<FinalExecutionOutcome | FinalExecutionOutcome[]> => {
      if (!wallet) {
        throw new Error("Wallet selector not initialized");
      }

      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      try {
        const selectedWallet = await wallet.wallet();
        if (!selectedWallet) {
          throw new Error("No wallet selected");
        }

        // Handle array of transactions
        const transactions = Array.isArray(transaction)
          ? transaction
          : [transaction];

        // Validate network compatibility for all transactions
        const { detectNetworkFromAccountId } = await import("./utils");
        const currentNetwork = nearConfig.networkId;

        for (const tx of transactions) {
          const recipientNetwork = detectNetworkFromAccountId(tx.receiverId);
          if (
            recipientNetwork !== "unknown" &&
            recipientNetwork !== currentNetwork
          ) {
            throw new Error(
              `Network mismatch: You are connected to ${currentNetwork} but trying to send to a ${recipientNetwork} address (${tx.receiverId}). Please switch your wallet to ${recipientNetwork} or use a ${currentNetwork} address.`,
            );
          }
        }

        // Convert our transaction format to wallet-selector format using NEAR API JS
        const { transactions: nearTransactions } = await import("near-api-js");

        const walletTransactions = transactions.map((tx) => {
          const actions = tx.actions.map((action) => {
            if (action.type === "Transfer") {
              // deposit is in yoctoNEAR string format, convert to BigInt
              return nearTransactions.transfer(BigInt(action.params.deposit));
            }
            if (action.type === "FunctionCall") {
              console.log("🔵 WALLET: FunctionCall action:", {
                methodName: action.params.methodName,
                args: action.params.args,
                gas: action.params.gas,
                deposit: action.params.deposit,
              });
              console.log(
                "🔵 WALLET: Args stringified:",
                JSON.stringify(action.params.args, null, 2),
              );

              return nearTransactions.functionCall(
                action.params.methodName,
                action.params.args,
                BigInt(action.params.gas),
                BigInt(action.params.deposit),
              );
            }
            throw new Error(`Unknown action type: ${(action as any).type}`);
          });

          return {
            signerId: accountId!,
            receiverId: tx.receiverId,
            actions,
          };
        });

        console.log(
          "🔵 WALLET: Full transaction payload:",
          JSON.stringify(
            {
              signerId: accountId!,
              transactionsCount: walletTransactions.length,
              transactions: walletTransactions.map((t) => ({
                receiverId: t.receiverId,
                actionsCount: t.actions.length,
              })),
            },
            null,
            2,
          ),
        );

        const result = await selectedWallet.signAndSendTransactions({
          transactions: walletTransactions,
        });

        // Refresh balance after transaction
        if (accountId) {
          await fetchBalance(accountId);
        }

        return result as unknown as FinalExecutionOutcome;
      } catch (error) {
        console.error("Failed to sign and send transaction:", error);
        throw error;
      }
    },
    [wallet, isConnected, accountId],
  );

  /**
   * Refresh the account balance
   */
  const refreshBalance = useCallback(async () => {
    if (accountId) {
      await fetchBalance(accountId);
    }
  }, [accountId, nearConfig.nodeUrl]);

  const value: WalletContextValue = {
    wallet,
    accountId,
    balance,
    isConnected,
    connect,
    disconnect,
    signAndSendTransaction,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context
 * @throws Error if used outside WalletProvider
 */
export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
