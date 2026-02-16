/**
 * Utility functions for NEAR blockchain operations
 */

import { utils } from "near-api-js";
import type { NearWalletErrorCode } from "./types";

/**
 * Convert NEAR amount to yoctoNEAR (smallest unit)
 * 1 NEAR = 10^24 yoctoNEAR
 * 
 * @param amount - Amount in NEAR (e.g., "1.5")
 * @returns Amount in yoctoNEAR as string
 */
export function parseNearAmount(amount: string): string {
  const parsed = utils.format.parseNearAmount(amount);
  if (!parsed) {
    throw new Error(`Invalid NEAR amount: ${amount}`);
  }
  return parsed;
}

/**
 * Convert yoctoNEAR to NEAR amount
 * 
 * @param yoctoAmount - Amount in yoctoNEAR
 * @param decimals - Number of decimal places (default: 5)
 * @returns Amount in NEAR as string
 */
export function formatNearAmount(yoctoAmount: string, decimals = 5): string {
  return utils.format.formatNearAmount(yoctoAmount, decimals);
}

/**
 * Validate NEAR account ID format
 * 
 * Valid formats:
 * - Implicit accounts: 64 character hex string
 * - Named accounts: lowercase alphanumeric with dots, hyphens, underscores
 * - Top-level accounts: must end with .near or .testnet
 * 
 * @param accountId - Account ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidAccountId(accountId: string): boolean {
  if (!accountId || typeof accountId !== "string") {
    return false;
  }

  // Implicit account (64 character hex)
  if (/^[0-9a-f]{64}$/.test(accountId)) {
    return true;
  }

  // Named account validation
  // Must be 2-64 characters
  if (accountId.length < 2 || accountId.length > 64) {
    return false;
  }

  // Must contain only lowercase letters, digits, hyphens, underscores, and dots
  if (!/^[a-z0-9._-]+$/.test(accountId)) {
    return false;
  }

  // Cannot start or end with separator
  if (/^[._-]|[._-]$/.test(accountId)) {
    return false;
  }

  // Cannot have consecutive separators
  if (/[._-]{2,}/.test(accountId)) {
    return false;
  }

  return true;
}

/**
 * Validate transaction amount
 * 
 * @param amount - Amount to validate
 * @returns true if valid, false otherwise
 */
export function isValidAmount(amount: string): boolean {
  if (!amount || typeof amount !== "string") {
    return false;
  }

  // Must be a valid number
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) {
    return false;
  }

  // Must be positive
  if (num <= 0) {
    return false;
  }

  // Must not be infinity
  if (!Number.isFinite(num)) {
    return false;
  }

  return true;
}

/**
 * Check if account has sufficient balance for transaction
 * 
 * @param balance - Current balance in yoctoNEAR
 * @param amount - Amount to send in yoctoNEAR
 * @param gasReserve - Gas reserve in yoctoNEAR (default: 0.1 NEAR)
 * @returns true if sufficient balance, false otherwise
 */
export function hasSufficientBalance(
  balance: string,
  amount: string,
  gasReserve = parseNearAmount("0.1") || "0"
): boolean {
  const balanceBigInt = BigInt(balance);
  const amountBigInt = BigInt(amount);
  const reserveBigInt = BigInt(gasReserve);

  return balanceBigInt >= amountBigInt + reserveBigInt;
}

/**
 * User-friendly error messages for NEAR wallet errors
 */
export const nearWalletErrorMessages: Record<NearWalletErrorCode, string> = {
  wallet_not_connected: "Please connect your NEAR wallet first",
  insufficient_balance: "Insufficient balance for this transaction",
  invalid_account_id: "Invalid NEAR account ID format",
  invalid_amount: "Invalid amount specified",
  transaction_rejected: "Transaction was rejected by user",
  transaction_failed: "Transaction failed on the blockchain",
  network_error: "Network error occurred. Please try again",
  account_not_found: "Account not found on the blockchain",
};

/**
 * Get user-friendly error message
 * 
 * @param code - Error code
 * @returns User-friendly error message
 */
export function getErrorMessage(code: NearWalletErrorCode): string {
  return nearWalletErrorMessages[code] || "An unknown error occurred";
}

/**
 * Format transaction hash for display
 * 
 * @param hash - Transaction hash
 * @param length - Number of characters to show on each side (default: 6)
 * @returns Formatted hash (e.g., "AbCdEf...123456")
 */
export function formatTransactionHash(hash: string, length = 6): string {
  if (hash.length <= length * 2) {
    return hash;
  }
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

/**
 * Get explorer URL for transaction
 * 
 * @param hash - Transaction hash
 * @param network - Network ID
 * @returns Explorer URL
 */
export function getExplorerUrl(hash: string, network: "testnet" | "mainnet"): string {
  const baseUrl = network === "mainnet" 
    ? "https://nearblocks.io/txns" 
    : "https://testnet.nearblocks.io/txns";
  return `${baseUrl}/${hash}`;
}

/**
 * Get explorer URL for account
 * 
 * @param accountId - Account ID
 * @param network - Network ID
 * @returns Explorer URL
 */
export function getAccountExplorerUrl(accountId: string, network: "testnet" | "mainnet"): string {
  const baseUrl = network === "mainnet" 
    ? "https://nearblocks.io/address" 
    : "https://testnet.nearblocks.io/address";
  return `${baseUrl}/${accountId}`;
}

/**
 * Detects the network from a NEAR account ID
 * 
 * @param accountId - NEAR account ID
 * @returns "testnet" | "mainnet" | "unknown"
 */
export function detectNetworkFromAccountId(accountId: string): "testnet" | "mainnet" | "unknown" {
  if (accountId.endsWith(".testnet")) {
    return "testnet";
  }
  if (accountId.endsWith(".near")) {
    return "mainnet";
  }
  // Implicit accounts (64 hex chars) don't have network suffix
  if (/^[0-9a-f]{64}$/.test(accountId)) {
    return "unknown";
  }
  // Top-level accounts without suffix are typically mainnet
  if (/^[a-z0-9_-]+$/.test(accountId) && accountId.length >= 2) {
    return "mainnet";
  }
  return "unknown";
}
