import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { getNearConfig } from "@/lib/near/config";
import { parseNearAmount } from "@/lib/near/utils";

type WrapNearProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * Wrap NEAR Tool
 * 
 * Wraps native NEAR tokens into wNEAR (wrapped NEAR) tokens.
 * This is required before swapping NEAR on DEXes like Ref Finance.
 */
export const wrapNear = ({ session, dataStream }: WrapNearProps) =>
  tool({
    description:
      "Wrap native NEAR tokens into wNEAR (wrapped NEAR). This is required before you can swap NEAR on decentralized exchanges. The wrapped tokens can be unwrapped back to NEAR at any time.",
    inputSchema: z.object({
      amount: z
        .string()
        .describe("Amount of NEAR to wrap (e.g., '0.1', '1', '5.5')"),
    }),
    execute: async ({ amount }) => {
      console.log("🔵 WRAP TOOL: wrapNear called", { amount });

      try {
        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          return {
            success: false,
            error: "Invalid amount. Please provide a positive number.",
          };
        }

        // Convert to yoctoNEAR
        const amountInYocto = parseNearAmount(amount);
        if (!amountInYocto) {
          return {
            success: false,
            error: "Failed to parse NEAR amount.",
          };
        }

        // Get network configuration
        const nearConfig = getNearConfig();
        const network = nearConfig.networkId;

        // Get wNEAR contract address
        const wNearContractId = network === "mainnet" 
          ? "wrap.near" 
          : "wrap.testnet";

        // Generate transaction ID
        const transactionId = generateUUID();

        // Send wrap request to client via dataStream
        dataStream.write({
          type: "data-nearWrapRequest",
          data: {
            id: transactionId,
            type: "wrap",
            amount,
            amountInYocto,
            contractId: wNearContractId,
          },
          transient: true,
        });

        // Return pending status
        return {
          success: true,
          pending: true,
          transactionId,
          message: `Wrapping ${amount} NEAR into wNEAR. Please confirm in your wallet.`,
          amount,
          network,
        };
      } catch (error) {
        console.error("Failed to create wrap transaction:", error);
        return {
          success: false,
          error: `Failed to wrap NEAR: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

/**
 * Unwrap NEAR Tool
 * 
 * Unwraps wNEAR (wrapped NEAR) tokens back into native NEAR tokens.
 */
export const unwrapNear = ({ session, dataStream }: WrapNearProps) =>
  tool({
    description:
      "Unwrap wNEAR (wrapped NEAR) tokens back into native NEAR. Use this to convert your wNEAR back to regular NEAR tokens.",
    inputSchema: z.object({
      amount: z
        .string()
        .describe("Amount of wNEAR to unwrap (e.g., '0.1', '1', '5.5')"),
    }),
    execute: async ({ amount }) => {
      console.log("🔵 WRAP TOOL: unwrapNear called", { amount });

      try {
        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          return {
            success: false,
            error: "Invalid amount. Please provide a positive number.",
          };
        }

        // Convert to yoctoNEAR
        const amountInYocto = parseNearAmount(amount);
        if (!amountInYocto) {
          return {
            success: false,
            error: "Failed to parse wNEAR amount.",
          };
        }

        // Get network configuration
        const nearConfig = getNearConfig();
        const network = nearConfig.networkId;

        // Get wNEAR contract address
        const wNearContractId = network === "mainnet" 
          ? "wrap.near" 
          : "wrap.testnet";

        // Generate transaction ID
        const transactionId = generateUUID();

        // Send unwrap request to client via dataStream
        dataStream.write({
          type: "data-nearUnwrapRequest",
          data: {
            id: transactionId,
            type: "unwrap",
            amount,
            amountInYocto,
            contractId: wNearContractId,
          },
          transient: true,
        });

        // Return pending status
        return {
          success: true,
          pending: true,
          transactionId,
          message: `Unwrapping ${amount} wNEAR back to NEAR. Please confirm in your wallet.`,
          amount,
          network,
        };
      } catch (error) {
        console.error("Failed to create unwrap transaction:", error);
        return {
          success: false,
          error: `Failed to unwrap NEAR: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
