import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { parseNearAmount } from "@/lib/near/utils";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type SendNearTokensProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * Validates NEAR account ID format
 * Valid formats:
 * - Implicit accounts: 64 character hex string
 * - Named accounts: lowercase alphanumeric with dots and hyphens, ending in .near or .testnet
 */
function isValidNearAccountId(accountId: string): boolean {
  // Implicit account (64 hex characters)
  if (/^[0-9a-f]{64}$/.test(accountId)) {
    return true;
  }

  // Named account
  // Must be 2-64 characters, lowercase alphanumeric with dots and hyphens
  // Must end with .near or .testnet (or be a top-level account)
  const namedAccountRegex = /^([a-z0-9]+[-_])*[a-z0-9]+\.([a-z0-9]+[-_])*[a-z0-9]+$/;
  
  if (accountId.length < 2 || accountId.length > 64) {
    return false;
  }

  // Check if it's a valid named account
  if (namedAccountRegex.test(accountId)) {
    return true;
  }

  // Check if it's a top-level account (no dots)
  if (/^[a-z0-9_-]+$/.test(accountId) && accountId.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Send NEAR Tokens Tool
 * 
 * This tool allows the AI to initiate NEAR token transfers.
 * The actual transaction execution happens on the client side after user confirmation.
 */
export const sendNearTokens = ({ session, dataStream }: SendNearTokensProps) =>
  tool({
    description:
      "Send NEAR tokens to another account. This will request user confirmation before executing the transaction. Use this when the user wants to transfer, send, or pay NEAR tokens to someone.",
    inputSchema: z.object({
      recipient: z
        .string()
        .describe(
          "The NEAR account ID to send tokens to (e.g., 'alice.testnet' or 'bob.near')"
        ),
      amount: z
        .string()
        .describe(
          "The amount of NEAR tokens to send (e.g., '0.5', '1', '10.25')"
        ),
      memo: z
        .string()
        .optional()
        .describe("Optional memo/note to include with the transaction"),
    }),
    execute: async ({ recipient, amount, memo }) => {
      console.log("🔵 NEAR TOOL: sendNearTokens called", { recipient, amount, memo });
      
      // Validate recipient account ID
      if (!isValidNearAccountId(recipient)) {
        return {
          success: false,
          error: `Invalid NEAR account ID: "${recipient}". Account IDs must be lowercase alphanumeric with dots and hyphens, and typically end with .near or .testnet`,
        };
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          success: false,
          error: `Invalid amount: "${amount}". Amount must be a positive number.`,
        };
      }

      // Convert amount to yoctoNEAR (smallest unit)
      let amountInYocto: string;
      try {
        amountInYocto = parseNearAmount(amount);
      } catch (error) {
        return {
          success: false,
          error: `Failed to parse amount: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }

      // Detect network from recipient address
      let network: "testnet" | "mainnet" = "testnet";
      if (recipient.endsWith(".near")) {
        network = "mainnet";
      } else if (recipient.endsWith(".testnet")) {
        network = "testnet";
      }

      // Generate transaction ID
      const transactionId = generateUUID();

      // Send transaction request to client via dataStream
      dataStream.write({
        type: "data-nearTransactionRequest",
        data: {
          id: transactionId,
          type: "transfer",
          recipient,
          amount,
          amountInYocto,
          memo: memo || undefined,
        },
        transient: true,
      });

      // Return pending status - the client will handle the actual transaction
      return {
        success: true,
        pending: true,
        transactionId,
        message: `Transaction request created. Waiting for user confirmation to send ${amount} NEAR to ${recipient}.`,
        recipient,
        amount,
        memo,
        network,
      };
    },
  });
