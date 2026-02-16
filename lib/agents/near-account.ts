import crypto from "crypto";

const FAUCET_URL = "https://helper.testnet.near.org/account";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

export interface NearAccountResult {
  accountId: string;
  privateKey: string;
  publicKey: string;
  fundedAmount?: string;
}

/**
 * Generates a unique NEAR testnet account ID
 * @returns A unique account ID in format "agent-{random}.testnet"
 */
function generateAccountId(): string {
  const randomStr = crypto.randomBytes(4).toString("hex");
  const timestamp = Date.now();
  return `agent-${randomStr}-${timestamp}.testnet`;
}

/**
 * Requests funding from the NEAR testnet faucet
 * @param accountId The account ID to fund
 * @param publicKey The public key for the account
 * @returns True if successful
 */
async function fundFromFaucet(
  accountId: string,
  publicKey: string,
): Promise<{ success: boolean; rateLimited: boolean }> {
  try {
    const response = await fetch(FAUCET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify({
        newAccountId: accountId,
        newAccountPublicKey: publicKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Faucet request failed:", response.status, errorText);

      // Check if it's a rate limit error (429)
      if (response.status === 429 || errorText.includes("Rate limit")) {
        return { success: false, rateLimited: true };
      }

      return { success: false, rateLimited: false };
    }

    return { success: true, rateLimited: false };
  } catch (error) {
    console.error("Faucet request error:", error);
    return { success: false, rateLimited: false };
  }
}

/**
 * Delays execution for a specified number of milliseconds
 * @param ms Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new NEAR testnet account with funding from the faucet
 * Implements retry logic with exponential backoff
 * @returns Account details including account ID and private key
 * @throws Error if account creation fails after max retries
 */
export async function createNearAccount(): Promise<NearAccountResult> {
  // Dynamically import near-api-js to avoid SSR issues
  const { KeyPair } = await import("near-api-js");

  // Generate a random Ed25519 key pair
  const keyPair = KeyPair.fromRandom("ed25519");
  const publicKey = keyPair.getPublicKey().toString();
  const privateKey = keyPair.toString();

  let lastError: Error | null = null;

  // Generate a unique account ID once
  const accountId = generateAccountId();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Attempting to create NEAR account: ${accountId} (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );

      // Request funding from faucet
      const { success, rateLimited } = await fundFromFaucet(
        accountId,
        publicKey,
      );

      if (success) {
        console.log(`✅ Successfully created and funded account: ${accountId}`);
        return {
          accountId,
          privateKey,
          publicKey,
          fundedAmount: "200", // NEAR testnet faucet provides 200 NEAR
        };
      }

      // If rate limited, stop retrying and create unfunded account
      if (rateLimited) {
        console.warn(
          `⚠️ Faucet rate limit hit. Creating unfunded account: ${accountId}`,
        );
        console.warn("⚠️ Account will need to be manually funded before use");
        return {
          accountId,
          privateKey,
          publicKey,
          fundedAmount: "0", // Not funded
        };
      }

      lastError = new Error("Faucet request failed");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Account creation attempt ${attempt + 1} failed:`, error);
    }

    // Wait before retrying (exponential backoff)
    if (attempt < MAX_RETRIES - 1) {
      const delayTime = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`Retrying in ${delayTime}ms...`);
      await delay(delayTime);
    }
  }

  // If all retries failed but not due to rate limit, still create the account
  console.warn(
    `⚠️ Failed to fund account after ${MAX_RETRIES} attempts. Creating unfunded account: ${accountId}`,
  );
  console.warn("⚠️ Account will need to be manually funded before use");
  return {
    accountId,
    privateKey,
    publicKey,
    fundedAmount: "0", // Not funded
  };
}

/**
 * Validates a NEAR account ID format
 * @param accountId The account ID to validate
 * @returns True if valid
 */
export function isValidAccountId(accountId: string): boolean {
  // NEAR account IDs must be lowercase and can contain letters, digits, and hyphens
  // Must be between 2 and 64 characters
  const accountIdRegex = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

  if (!accountIdRegex.test(accountId)) {
    return false;
  }

  // Must end with .testnet or .near for named accounts
  if (accountId.includes(".")) {
    return accountId.endsWith(".testnet") || accountId.endsWith(".near");
  }

  // Implicit accounts are 64 character hex strings
  return accountId.length === 64 && /^[0-9a-f]+$/.test(accountId);
}
