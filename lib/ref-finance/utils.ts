/**
 * Ref Finance Utility Functions
 */

import { providers } from "near-api-js";
import { getTokenMetadata, getSupportedTokens, isTokenSupported } from "./tokens";
import { fromTokenAmount, toTokenAmount } from "./swap";
import { getNearConfig } from "@/lib/near/config";

/**
 * Lookup token by symbol
 * 
 * @param symbol - Token symbol (case-insensitive)
 * @param network - Network to use
 * @returns Token metadata or undefined if not found
 */
export function lookupToken(symbol: string, network: "testnet" | "mainnet") {
  return getTokenMetadata(symbol, network);
}

/**
 * Format amount with token symbol
 * 
 * @param amount - Amount in smallest unit
 * @param symbol - Token symbol
 * @param decimals - Token decimals
 * @returns Formatted string (e.g., "1.5 USDT")
 */
export function formatTokenAmount(
  amount: string,
  symbol: string,
  decimals: number
): string {
  const formatted = fromTokenAmount(amount, decimals);
  return `${formatted} ${symbol}`;
}

/**
 * Parse user input amount to token's smallest unit
 * 
 * @param input - User input (e.g., "1.5")
 * @param decimals - Token decimals
 * @returns Amount in smallest unit
 */
export function parseTokenAmount(input: string, decimals: number): string {
  return toTokenAmount(input, decimals);
}

/**
 * Validate if user has sufficient balance for swap
 * 
 * @param balance - Current balance in smallest unit
 * @param amount - Amount to swap in smallest unit
 * @param gasReserve - Gas reserve in smallest unit (default: 0.1 NEAR for NEAR token)
 * @returns true if sufficient balance
 */
export function hasSufficientBalance(
  balance: string,
  amount: string,
  gasReserve = "100000000000000000000000" // 0.1 NEAR in yoctoNEAR
): boolean {
  try {
    const balanceBigInt = BigInt(balance);
    const amountBigInt = BigInt(amount);
    const reserveBigInt = BigInt(gasReserve);
    
    return balanceBigInt >= amountBigInt + reserveBigInt;
  } catch (error) {
    console.error("Error checking balance:", error);
    return false;
  }
}

/**
 * Get token balance for an account
 * 
 * @param accountId - NEAR account ID
 * @param tokenId - Token contract ID
 * @param network - Network to use
 * @returns Balance in smallest unit as string
 */
export async function getTokenBalance(
  accountId: string,
  tokenId: string,
  network: "testnet" | "mainnet"
): Promise<string> {
  try {
    const nearConfig = getNearConfig();
    const provider = new providers.JsonRpcProvider({
      url: nearConfig.nodeUrl,
    });
    
    // For wrapped NEAR, query the account balance
    if (tokenId === "wrap.testnet" || tokenId === "wrap.near") {
      const account = await provider.query({
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      }) as any;
      
      return account.amount || "0";
    }
    
    // For other tokens, call ft_balance_of on the token contract
    const result = await provider.query({
      request_type: "call_function",
      finality: "final",
      account_id: tokenId,
      method_name: "ft_balance_of",
      args_base64: Buffer.from(JSON.stringify({ account_id: accountId })).toString("base64"),
    }) as any;
    
    const balance = JSON.parse(Buffer.from(result.result).toString());
    return balance || "0";
  } catch (error) {
    console.error("Failed to get token balance:", error);
    return "0";
  }
}

/**
 * Get list of supported tokens for display
 * 
 * @param network - Network to use
 * @returns Comma-separated list of token symbols
 */
export function getSupportedTokensList(network: "testnet" | "mainnet"): string {
  return getSupportedTokens(network).join(", ");
}

/**
 * Validate swap parameters
 * 
 * @param fromToken - Source token symbol
 * @param toToken - Destination token symbol
 * @param amount - Amount to swap
 * @param network - Network to use
 * @returns Validation result with error message if invalid
 */
export function validateSwapParams(
  fromToken: string,
  toToken: string,
  amount: string,
  network: "testnet" | "mainnet"
): { valid: boolean; error?: string } {
  // Check if tokens are supported
  if (!isTokenSupported(fromToken, network)) {
    return {
      valid: false,
      error: `Token "${fromToken}" is not supported. Supported tokens: ${getSupportedTokensList(network)}`,
    };
  }
  
  if (!isTokenSupported(toToken, network)) {
    return {
      valid: false,
      error: `Token "${toToken}" is not supported. Supported tokens: ${getSupportedTokensList(network)}`,
    };
  }
  
  // Check if tokens are different
  if (fromToken.toUpperCase() === toToken.toUpperCase()) {
    return {
      valid: false,
      error: "Cannot swap a token to itself",
    };
  }
  
  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return {
      valid: false,
      error: `Invalid amount: "${amount}". Amount must be a positive number.`,
    };
  }
  
  return { valid: true };
}
