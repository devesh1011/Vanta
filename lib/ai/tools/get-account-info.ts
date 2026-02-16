import { tool } from "ai";
import { z } from "zod";
import { getNearConfig } from "@/lib/near/config";
import { formatNearAmount } from "@/lib/near/utils";

/**
 * Get NEAR Account Info Tool
 *
 * This tool allows the AI to query information about any NEAR account.
 * This runs server-side and queries the NEAR blockchain directly.
 */
export const getAccountInfo = tool({
  description:
    "Get information about a NEAR account including balance, storage usage, and account status. Use this to check if an account exists or to get details about any NEAR account.",
  inputSchema: z.object({
    accountId: z
      .string()
      .describe(
        "The NEAR account ID to query (e.g., 'alice.testnet' or 'bob.near')",
      ),
  }),
  execute: async ({ accountId }) => {
    try {
      const { providers } = await import("near-api-js");
      const nearConfig = getNearConfig();
      const provider = new providers.JsonRpcProvider({
        url: nearConfig.nodeUrl,
      });

      // Query account information
      const account = (await provider.query({
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      })) as any;

      if (!account) {
        return {
          success: false,
          error: `Account "${accountId}" not found.`,
        };
      }

      // Format the response
      const balance = formatNearAmount(account.amount);
      const storageUsage = account.storage_usage;
      const storageCost = formatNearAmount(
        (BigInt(storageUsage) * BigInt("10000000000000000000")).toString(),
      );

      return {
        success: true,
        accountId,
        balance: `${balance} NEAR`,
        balanceRaw: account.amount,
        storageUsage: `${storageUsage} bytes`,
        storageCost: `${storageCost} NEAR`,
        codeHash: account.code_hash,
        blockHeight: account.block_height,
        blockHash: account.block_hash,
      };
    } catch (error: any) {
      // Check if account doesn't exist
      if (
        error.message?.includes("does not exist") ||
        error.type === "AccountDoesNotExist"
      ) {
        return {
          success: false,
          error: `Account "${accountId}" does not exist on the NEAR blockchain.`,
          suggestion:
            "Make sure the account ID is spelled correctly and exists on the network.",
        };
      }

      // Other errors
      return {
        success: false,
        error: `Failed to fetch account info: ${error.message || "Unknown error"}`,
      };
    }
  },
});
