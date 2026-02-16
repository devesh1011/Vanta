import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { getNearConfig } from "@/lib/near/config";
import { formatNearAmount } from "@/lib/near/utils";

type CheckBalanceProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * Check NEAR Balance Tool
 *
 * This tool queries the NEAR blockchain to get account balance.
 * Uses NEAR RPC API to fetch real-time balance data.
 */
export const checkBalance = ({ session, dataStream }: CheckBalanceProps) =>
  tool({
    description:
      "Check the NEAR token balance for any NEAR account by querying the blockchain. Use this tool when the user provides a specific account ID to check.",
    inputSchema: z.object({
      accountId: z
        .string()
        .describe(
          "The NEAR account ID to check (e.g., 'alice.testnet' or 'bob.near')",
        ),
    }),
    execute: async ({ accountId }) => {
      console.log("🔵 NEAR TOOL: checkBalance called", { accountId });

      try {
        // Dynamically import near-api-js to avoid SSR issues
        const { providers } = await import("near-api-js");

        const nearConfig = getNearConfig();
        const provider = new providers.JsonRpcProvider({
          url: nearConfig.nodeUrl,
        });

        // Query account balance from blockchain
        const account = (await provider.query({
          request_type: "view_account",
          finality: "final",
          account_id: accountId,
        })) as any;

        if (!account) {
          return {
            success: false,
            error: `Account "${accountId}" not found on the NEAR blockchain.`,
          };
        }

        // Format the balance
        const balance = formatNearAmount(account.amount);
        const explorerUrl = `${nearConfig.explorerUrl}/address/${accountId}`;

        return {
          success: true,
          accountId,
          balance: `${balance} NEAR`,
          balanceRaw: account.amount,
          explorerUrl,
          network: nearConfig.networkId,
        };
      } catch (error: any) {
        if (
          error.message?.includes("does not exist") ||
          error.type === "AccountDoesNotExist"
        ) {
          return {
            success: false,
            error: `Account "${accountId}" does not exist on the NEAR blockchain.`,
          };
        }

        return {
          success: false,
          error: `Failed to fetch balance: ${error.message || "Unknown error"}`,
        };
      }
    },
  });
