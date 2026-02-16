/**
 * Ref Finance Swap Functions
 * 
 * Implements token swaps using Ref Finance DEX on NEAR
 * Uses direct smart contract calls to be browser-compatible
 */

import { providers } from "near-api-js";
import type { Transaction } from "@/lib/near/types";
import { getRefConfig } from "./config";
import { getNearConfig } from "@/lib/near/config";

/**
 * Convert a number string (possibly in scientific notation) to a full digit string
 * This is needed because BigInt cannot parse scientific notation
 */
function convertScientificToString(value: string): string {
  // If it's already a plain integer string, return as-is
  if (!/e/i.test(value)) {
    return value;
  }
  
  // Parse the scientific notation
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`Invalid number: ${value}`);
  }
  
  // Convert to full string without scientific notation
  // Use toLocaleString with 'fullwide' to avoid scientific notation
  return num.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 });
}

export interface SwapEstimate {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  expectedOutput: string;
  minimumOutput: string;
  priceImpact: string;
  pool: string[];
}

interface Pool {
  id?: number;
  pool_kind?: string;
  token_account_ids: string[];
  amounts: string[];
  total_fee: number;
  shares_total_supply: string;
}

/**
 * Find a pool that supports swapping between two tokens
 */
async function findPool(
  tokenIn: string,
  tokenOut: string,
  network: "testnet" | "mainnet"
): Promise<number | null> {
  try {
    const refConfig = getRefConfig(network);
    const nearConfig = getNearConfig();
    
    const provider = new providers.JsonRpcProvider({
      url: nearConfig.nodeUrl,
    });
    
    // Get number of pools
    const numPoolsResult = await provider.query({
      request_type: "call_function",
      finality: "final",
      account_id: refConfig.contractId,
      method_name: "get_number_of_pools",
      args_base64: "",
    }) as any;
    
    const numPools = JSON.parse(Buffer.from(numPoolsResult.result).toString());
    console.log(`🔵 REF: Found ${numPools} pools on ${network}`);
    
    // Query pools in batches to find one with our token pair
    const batchSize = 100;
    for (let i = 0; i < Math.min(numPools, 500); i += batchSize) {
      const poolsResult = await provider.query({
        request_type: "call_function",
        finality: "final",
        account_id: refConfig.contractId,
        method_name: "get_pools",
        args_base64: Buffer.from(
          JSON.stringify({
            from_index: i,
            limit: batchSize,
          })
        ).toString("base64"),
      }) as any;
      
      const pools: Pool[] = JSON.parse(Buffer.from(poolsResult.result).toString());
      
      // Find a pool with both tokens
      for (let j = 0; j < pools.length; j++) {
        const pool = pools[j];
        const poolId = i + j; // Pool ID is the index in the overall list
        const hasTokenIn = pool.token_account_ids.includes(tokenIn);
        const hasTokenOut = pool.token_account_ids.includes(tokenOut);
        
        if (hasTokenIn && hasTokenOut) {
          console.log(`🔵 REF: Found pool ${poolId} for ${tokenIn} <-> ${tokenOut}`);
          console.log(`🔵 REF: Pool tokens:`, pool.token_account_ids);
          console.log(`🔵 REF: Pool type:`, pool.pool_kind);
          return poolId;
        }
      }
    }
    
    console.log(`🔵 REF: No pool found for ${tokenIn} <-> ${tokenOut}`);
    return null;
  } catch (error) {
    console.error("Error finding pool:", error);
    return null;
  }
}

/**
 * Estimate a token swap using Ref Finance pools
 */
export async function estimateSwap(
  inputTokenId: string,
  inputAmount: string,
  outputTokenId: string,
  network: "testnet" | "mainnet"
): Promise<SwapEstimate> {
  try {
    const poolId = await findPool(inputTokenId, outputTokenId, network);
    
    if (poolId === null) {
      throw new Error(`No liquidity pool found for ${inputTokenId} <-> ${outputTokenId}`);
    }
    
    const refConfig = getRefConfig(network);
    const nearConfig = getNearConfig();
    
    const provider = new providers.JsonRpcProvider({
      url: nearConfig.nodeUrl,
    });
    
    // Ensure inputAmount is not in scientific notation
    const inputAmountStr = convertScientificToString(inputAmount);
    
    console.log(`🔵 REF: Estimating swap with amount:`, inputAmountStr);
    
    // Get swap estimate from Ref Finance
    const result = await provider.query({
      request_type: "call_function",
      finality: "final",
      account_id: refConfig.contractId,
      method_name: "get_return",
      args_base64: Buffer.from(
        JSON.stringify({
          pool_id: poolId,
          token_in: inputTokenId,
          amount_in: inputAmountStr,
          token_out: outputTokenId,
        })
      ).toString("base64"),
    }) as any;
    
    const expectedOutput = JSON.parse(Buffer.from(result.result).toString());
    
    // Calculate minimum output with 1% slippage
    const minimumOutput = (BigInt(expectedOutput) * BigInt(99) / BigInt(100)).toString();
    
    // Simple price impact calculation (would need more sophisticated calculation in production)
    const priceImpact = "0.5";
    
    return {
      inputToken: inputTokenId,
      outputToken: outputTokenId,
      inputAmount,
      expectedOutput: expectedOutput.toString(),
      minimumOutput,
      priceImpact,
      pool: [poolId.toString()],
    };
  } catch (error) {
    console.error("Failed to estimate swap:", error);
    throw error;
  }
}

/**
 * Check if an account is registered with a token contract
 */
async function isAccountRegistered(
  tokenId: string,
  accountId: string,
  network: "testnet" | "mainnet"
): Promise<boolean> {
  try {
    const nearConfig = getNearConfig();
    const provider = new providers.JsonRpcProvider({
      url: nearConfig.nodeUrl,
    });
    
    const result = await provider.query({
      request_type: "call_function",
      finality: "final",
      account_id: tokenId,
      method_name: "storage_balance_of",
      args_base64: Buffer.from(
        JSON.stringify({
          account_id: accountId,
        })
      ).toString("base64"),
    }) as any;
    
    const balance = JSON.parse(Buffer.from(result.result).toString());
    return balance !== null;
  } catch (error) {
    console.log(`🔵 REF: Could not check registration for ${accountId} on ${tokenId}:`, error);
    return false;
  }
}

/**
 * Generate swap transaction data using Ref Finance format
 * 
 * Based on Ref Finance SDK documentation:
 * Swaps use ft_transfer_call to the input token contract
 */
export async function generateSwapTransaction(
  inputTokenId: string,
  inputAmount: string,
  outputTokenId: string,
  minimumOutput: string,
  network: "testnet" | "mainnet",
  accountId?: string,
  needsWrapping?: boolean,
  wrapAmount?: string
): Promise<Transaction[]> {
  const config = getRefConfig(network);
  
  // Find the pool for this token pair
  const poolId = await findPool(inputTokenId, outputTokenId, network);
  
  if (poolId === null) {
    throw new Error(`No liquidity pool found for ${inputTokenId} <-> ${outputTokenId}`);
  }
  
  console.log(`🔵 REF: Generating swap transaction using pool ${poolId}`);
  console.log(`🔵 REF: Input amount received:`, inputAmount);
  console.log(`🔵 REF: Minimum output received:`, minimumOutput);
  
  // Ensure amounts are strings without scientific notation
  // If the input is in scientific notation, convert it properly
  const inputAmountStr = convertScientificToString(inputAmount);
  const minimumOutputStr = convertScientificToString(minimumOutput);
  
  console.log(`🔵 REF: Input amount converted:`, inputAmountStr);
  console.log(`🔵 REF: Minimum output converted:`, minimumOutputStr);
  
  // Ref Finance swap format: ft_transfer_call to the input token
  // The msg contains the swap instructions as a JSON string
  // Format must match exactly what Ref Finance expects
  const swapMsg = JSON.stringify({
    force: 0,
    referral_id: null,
    actions: [
      {
        pool_id: poolId,
        token_in: inputTokenId,
        token_out: outputTokenId,
        amount_in: inputAmountStr,
        min_amount_out: minimumOutputStr,
      },
    ],
  });
  
  console.log(`🔵 REF: Swap message:`, swapMsg);
  console.log(`🔵 REF: Pool ID:`, poolId);
  console.log(`🔵 REF: Input amount:`, inputAmountStr);
  console.log(`🔵 REF: Min output:`, minimumOutputStr);
  
  const transactions: Transaction[] = [];
  
  // If swapping native NEAR, add wrapping transaction first
  if (needsWrapping) {
    // Use the wrapAmount if provided (which includes gas buffer), otherwise use inputAmount
    const actualWrapAmount = wrapAmount || inputAmountStr;
    console.log(`🔵 REF: Adding NEAR wrapping transaction for ${actualWrapAmount} yoctoNEAR`);
    transactions.push({
      receiverId: inputTokenId, // wrap.testnet or wrap.near
      actions: [
        {
          type: "FunctionCall" as const,
          params: {
            methodName: "near_deposit",
            args: {},
            gas: "30000000000000", // 30 TGas
            deposit: actualWrapAmount, // Attach the NEAR to wrap (with buffer if provided)
          },
        },
      ],
    });
  }
  
  // Only add storage deposit for output token (most likely to be unregistered)
  // Storage deposits are refundable if already registered, so this is safe
  console.log(`🔵 REF: Adding storage deposit for output token ${outputTokenId}`);
  transactions.push({
    receiverId: outputTokenId,
    actions: [
      {
        type: "FunctionCall" as const,
        params: {
          methodName: "storage_deposit",
          args: {
            account_id: accountId || null,
            registration_only: true,
          },
          gas: "30000000000000", // 30 TGas
          deposit: "1250000000000000000000", // 0.00125 NEAR storage deposit
        },
      },
    ],
  });
  
  // Add the swap transaction
  transactions.push({
    receiverId: inputTokenId, // Call ft_transfer_call on the input token contract
    actions: [
      {
        type: "FunctionCall" as const,
        params: {
          methodName: "ft_transfer_call",
          args: {
            receiver_id: config.contractId, // Ref Finance contract
            amount: inputAmountStr, // Use string version
            msg: swapMsg,
          },
          gas: "180000000000000", // 180 TGas (as per SDK example)
          deposit: "1", // 1 yoctoNEAR for security
        },
      },
    ],
  });
  
  console.log(`🔵 REF: Generated ${transactions.length} transaction(s)`);
  console.log(`🔵 REF: Transaction receivers:`, transactions.map(t => t.receiverId));
  return transactions;
}

/**
 * Convert token amount from human-readable to smallest unit
 * 
 * @param amount - Human-readable amount (e.g., "1.5")
 * @param decimals - Token decimals
 * @returns Amount in smallest unit as string
 */
export function toTokenAmount(amount: string, decimals: number): string {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  const multiplier = Math.pow(10, decimals);
  const result = Math.floor(amountNum * multiplier);
  
  return result.toString();
}

/**
 * Convert token amount from smallest unit to human-readable
 * 
 * @param amount - Amount in smallest unit
 * @param decimals - Token decimals
 * @param maxDecimals - Maximum decimal places to show (default: 6)
 * @returns Human-readable amount
 */
export function fromTokenAmount(
  amount: string,
  decimals: number,
  maxDecimals = 6
): string {
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) {
    return "0";
  }
  
  const divisor = Math.pow(10, decimals);
  const result = amountNum / divisor;
  
  // Format with max decimals, removing trailing zeros
  return result.toFixed(maxDecimals).replace(/\.?0+$/, "");
}
