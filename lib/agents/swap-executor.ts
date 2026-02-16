import type { TokenPrediction } from "./token-analyzer";
import {
  estimateSwap,
  generateSwapTransaction,
  toTokenAmount,
} from "@/lib/ref-finance/swap";
import { getRefConfig } from "@/lib/ref-finance/config";

const NEAR_CONFIG = {
  networkId: "testnet",
  nodeUrl: "https://test.rpc.fastnear.com",
  walletUrl: "https://testnet.mynearwallet.com/",
  helperUrl: "https://helper.testnet.near.org",
};

const WRAP_NEAR_CONTRACT = "wrap.testnet";
const NEAR_TOKEN = "wrap.testnet"; // wNEAR on testnet

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amountSwapped?: string;
}

/**
 * Prepares and executes a token swap on Ref Finance
 * @param accountId Agent's NEAR account ID
 * @param privateKey Agent's private key (decrypted)
 * @param prediction Token prediction from AI
 * @param amountInNear Amount of NEAR to swap
 * @returns Swap result with transaction hash
 */
export async function executeTokenSwap(
  accountId: string,
  privateKey: string,
  prediction: TokenPrediction,
  amountInNear: string,
): Promise<SwapResult> {
  try {
    console.log(
      `🤖 Executing swap for ${accountId}: ${amountInNear} NEAR -> ${prediction.symbol}`,
    );

    // Dynamically import near-api-js to avoid SSR issues
    const {
      connect,
      keyStores,
      KeyPair,
      transactions: nearTransactions,
      utils,
    } = await import("near-api-js");

    // Create key store and add the agent's key
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(privateKey as any); // Type assertion for key format
    await keyStore.setKey(NEAR_CONFIG.networkId, accountId, keyPair);

    // Connect to NEAR
    const near = await connect({
      ...NEAR_CONFIG,
      keyStore,
    });

    const account = await near.account(accountId);

    // Convert NEAR amount to yoctoNEAR for wrapping
    const wrapAmount = utils.format.parseNearAmount(amountInNear);

    if (!wrapAmount) {
      throw new Error("Invalid NEAR amount");
    }

    console.log(`🤖 Wrapping ${amountInNear} NEAR (${wrapAmount} yoctoNEAR)`);

    // Step 1: Wrap NEAR first
    console.log("🤖 Step 1: Wrapping NEAR...");
    const wrapTx = await account.signAndSendTransaction({
      receiverId: WRAP_NEAR_CONTRACT,
      actions: [
        nearTransactions.functionCall(
          "near_deposit",
          {},
          BigInt("30000000000000"), // 30 TGas
          BigInt(wrapAmount),
        ),
      ],
    });

    console.log(`🤖 Wrapped NEAR: ${wrapTx.transaction.hash}`);

    // Wait for wrapping to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 2: Check actual wNEAR balance after wrapping
    console.log("🤖 Step 2: Checking wNEAR balance...");
    const provider = near.connection.provider;
    const wNearBalanceResult = (await provider.query({
      request_type: "call_function",
      finality: "final",
      account_id: WRAP_NEAR_CONTRACT,
      method_name: "ft_balance_of",
      args_base64: Buffer.from(
        JSON.stringify({ account_id: accountId }),
      ).toString("base64"),
    })) as any;

    const wNearBalance = JSON.parse(
      Buffer.from(wNearBalanceResult.result).toString(),
    );
    console.log(
      `🤖 wNEAR balance: ${wNearBalance} (${utils.format.formatNearAmount(wNearBalance)} wNEAR)`,
    );

    // Use the actual wNEAR balance for swap (this accounts for any gas fees or rounding)
    const swapAmount = wNearBalance;

    // Step 3: Get swap estimate
    console.log("🤖 Step 3: Getting swap estimate...");
    const estimate = await estimateSwap(
      NEAR_TOKEN,
      swapAmount,
      prediction.selectedToken,
      "testnet",
    );

    console.log(
      `🤖 Estimated output: ${estimate.expectedOutput} (min: ${estimate.minimumOutput})`,
    );

    // Step 4: Generate swap transactions (storage deposit and swap only, no wrapping)
    console.log("🤖 Step 4: Generating swap transactions...");
    const transactions = await generateSwapTransaction(
      NEAR_TOKEN,
      swapAmount,
      prediction.selectedToken,
      estimate.minimumOutput,
      "testnet",
      accountId,
      false, // needsWrapping = false (already wrapped)
    );

    console.log(`🤖 Generated ${transactions.length} transactions`);

    // Step 5: Execute remaining transactions (storage deposit and swap)
    const txHashes: string[] = [wrapTx.transaction.hash];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      console.log(
        `🤖 Step ${i + 5}: Executing transaction to ${tx.receiverId}...`,
      );

      // Convert our transaction format to NEAR API format
      const actions = tx.actions.map((action) => {
        if (action.type === "FunctionCall") {
          return nearTransactions.functionCall(
            action.params.methodName,
            action.params.args,
            BigInt(action.params.gas),
            BigInt(action.params.deposit),
          );
        }
        throw new Error(`Unsupported action type: ${action.type}`);
      });

      const result = await account.signAndSendTransaction({
        receiverId: tx.receiverId,
        actions,
      });

      const txHash = result.transaction.hash;
      txHashes.push(txHash);
      console.log(
        `🤖 Transaction ${i + 1}/${transactions.length} sent: ${txHash}`,
      );

      // Wait for transaction to be finalized before proceeding to next transaction
      // This is critical for sequential transactions that depend on each other
      if (i < transactions.length - 1) {
        console.log(`🤖 Waiting for transaction to finalize...`);

        // Wait for the transaction to be finalized (typically 2-3 seconds on testnet)
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait

        while (attempts < maxAttempts) {
          try {
            const txStatus = await near.connection.provider.txStatus(
              txHash,
              accountId,
              "FINAL",
            );

            if (
              txStatus.status &&
              typeof txStatus.status === "object" &&
              "SuccessValue" in txStatus.status
            ) {
              console.log(`🤖 Transaction finalized successfully`);
              break;
            }
          } catch (e) {
            // Transaction not yet available, continue waiting
          }

          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error(`Transaction ${txHash} did not finalize in time`);
        }

        // Add a small additional delay to ensure state is propagated
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`🤖 Swap completed successfully!`);
    console.log(`🤖 Transaction hashes:`, txHashes);

    return {
      success: true,
      transactionHash: txHashes[txHashes.length - 1], // Return the final swap transaction
      amountSwapped: amountInNear,
    };
  } catch (error) {
    console.error("🤖 Swap execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Estimates the output amount for a swap
 * @param tokenIn Input token
 * @param tokenOut Output token
 * @param amountIn Amount to swap
 * @returns Estimated output amount
 */
export async function estimateSwapOutput(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
): Promise<string> {
  // This would call Ref Finance API to get swap estimate
  // Simplified for now
  return "0";
}
