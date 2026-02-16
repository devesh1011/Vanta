import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { getNearConfig } from "@/lib/near/config";
import { lookupToken, validateSwapParams, parseTokenAmount, getSupportedTokensList } from "@/lib/ref-finance/utils";

type SwapTokensProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * Swap Tokens Tool
 * 
 * This tool executes a token swap on Ref Finance DEX.
 * It sends the swap request to the client which will use Ref SDK to generate and execute the transaction.
 */
export const swapTokens = ({ session, dataStream }: SwapTokensProps) =>
  tool({
    description:
      "Swap tokens on Ref Finance DEX. Use this when the user wants to swap/exchange tokens. This will generate the swap transaction and send it to the wallet for confirmation. The swap includes 1% slippage protection.",
    inputSchema: z.object({
      fromToken: z
        .string()
        .describe("Source token symbol (e.g., 'NEAR', 'USDT', 'USDC')"),
      amount: z
        .string()
        .describe("Amount to swap in human-readable format (e.g., '0.1', '5.5')"),
      toToken: z
        .string()
        .describe("Destination token symbol (e.g., 'USDT', 'USDC', 'NEAR')"),
    }),
    execute: async ({ fromToken, amount, toToken }) => {
      console.log("🔵 REF TOOL: swapTokens called", {
        fromToken,
        amount,
        toToken,
      });

      try {
        // Get network configuration
        const nearConfig = getNearConfig();
        const network = nearConfig.networkId;

        // Validate swap parameters
        const validation = validateSwapParams(fromToken, toToken, amount, network);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error,
          };
        }

        // Lookup token metadata
        const fromTokenMeta = lookupToken(fromToken, network);
        const toTokenMeta = lookupToken(toToken, network);

        if (!fromTokenMeta || !toTokenMeta) {
          const supportedTokens = getSupportedTokensList(network);
          return {
            success: false,
            error: `Token not found. Supported tokens on ${network}: ${supportedTokens}`,
          };
        }

        // Special handling for NEAR -> automatically wrap and swap
        // If user says "swap NEAR", we'll treat it as wNEAR and include wrapping in the transaction
        const fromTokenUpper = fromToken.toUpperCase();
        let needsWrapping = false;
        
        if (fromTokenUpper === "NEAR") {
          // User wants to swap native NEAR - we'll wrap it automatically
          needsWrapping = true;
          fromToken = "wNEAR"; // Change to wNEAR for the rest of the flow
        }

        // Convert amount to token's smallest unit
        const amountInSmallestUnit = parseTokenAmount(
          amount,
          fromTokenMeta.decimals
        );

        // Estimate the swap to get expected output and minimum output
        const { estimateSwap } = await import("@/lib/ref-finance/swap");
        const estimate = await estimateSwap(
          fromTokenMeta.id,
          amountInSmallestUnit,
          toTokenMeta.id,
          network
        );

        // Generate transaction ID
        const transactionId = generateUUID();

        // Detect network for explorer URL
        let explorerNetwork: "testnet" | "mainnet" = "testnet";
        if (network === "mainnet") {
          explorerNetwork = "mainnet";
        }

        // Send swap request to client via dataStream
        // The client will use Ref SDK to generate the transaction and execute it
        dataStream.write({
          type: "data-nearSwapRequest",
          data: {
            id: transactionId,
            type: "swap",
            fromToken: fromTokenMeta.symbol,
            toToken: toTokenMeta.symbol,
            amount,
            minimumOutput: estimate.minimumOutput,
            fromTokenId: fromTokenMeta.id,
            toTokenId: toTokenMeta.id,
            amountInSmallestUnit,
            minimumOutputInSmallestUnit: estimate.minimumOutput,
            needsWrapping, // Flag to indicate if we need to wrap NEAR first
          },
          transient: true,
        });

        // Return pending status - the client will handle the actual transaction
        return {
          success: true,
          pending: true,
          transactionId,
          message: `Swap transaction created. Please confirm in your wallet to swap ${amount} ${fromTokenMeta.symbol} to ${toTokenMeta.symbol}.`,
          fromToken: fromTokenMeta.symbol,
          toToken: toTokenMeta.symbol,
          amount,
          network: explorerNetwork,
        };
      } catch (error) {
        console.error("Failed to create swap:", error);
        return {
          success: false,
          error: `Failed to create swap: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
