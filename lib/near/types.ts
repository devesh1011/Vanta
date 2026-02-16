/**
 * TypeScript types for NEAR wallet integration
 */

import type { WalletSelector } from "@near-wallet-selector/core";
import type { FinalExecutionOutcome } from "near-api-js/lib/providers";

/**
 * Wallet context value provided to the application
 */
export interface WalletContextValue {
  /** The wallet selector instance */
  wallet: WalletSelector | null;
  /** Connected account ID */
  accountId: string | null;
  /** Account balance in NEAR */
  balance: string | null;
  /** Whether a wallet is connected */
  isConnected: boolean;
  /** Connect to a wallet */
  connect: () => Promise<void>;
  /** Disconnect from the current wallet */
  disconnect: () => Promise<void>;
  /** Sign and send a transaction or multiple transactions */
  signAndSendTransaction: (transaction: Transaction | Transaction[]) => Promise<FinalExecutionOutcome | FinalExecutionOutcome[]>;
  /** Refresh the account balance */
  refreshBalance: () => Promise<void>;
}

/**
 * NEAR transaction structure
 */
export interface Transaction {
  /** The account ID that will receive the transaction */
  receiverId: string;
  /** Array of actions to perform */
  actions: Action[];
}

/**
 * NEAR transaction action
 */
export type Action = TransferAction | FunctionCallAction;

/**
 * Transfer action for sending NEAR tokens
 */
export interface TransferAction {
  type: "Transfer";
  params: {
    /** Amount in yoctoNEAR (1 NEAR = 10^24 yoctoNEAR) */
    deposit: string;
  };
}

/**
 * Function call action for smart contract interactions
 */
export interface FunctionCallAction {
  type: "FunctionCall";
  params: {
    /** Method name to call */
    methodName: string;
    /** Arguments as JSON string */
    args: Record<string, unknown>;
    /** Gas to attach (in gas units) */
    gas: string;
    /** Amount to attach in yoctoNEAR */
    deposit: string;
  };
}

/**
 * Transaction record for database storage
 */
export interface TransactionRecord {
  id: string;
  chatId: string;
  type: "send" | "receive";
  from: string;
  to: string;
  amount: string;
  status: "pending" | "success" | "failed";
  transactionHash: string;
  timestamp: Date;
  gasUsed?: string;
  errorMessage?: string;
}

/**
 * Wallet state for persistence
 */
export interface WalletState {
  accountId: string | null;
  balance: string | null;
  isConnected: boolean;
  network: "testnet" | "mainnet";
}

/**
 * NEAR error codes
 */
export type NearWalletErrorCode =
  | "wallet_not_connected"
  | "insufficient_balance"
  | "invalid_account_id"
  | "invalid_amount"
  | "transaction_rejected"
  | "transaction_failed"
  | "network_error"
  | "account_not_found";

/**
 * NEAR wallet error
 */
export class NearWalletError extends Error {
  constructor(
    public code: NearWalletErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "NearWalletError";
  }
}
