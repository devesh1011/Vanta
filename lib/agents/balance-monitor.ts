const NEAR_CONFIG = {
  networkId: "testnet",
  nodeUrl: "https://test.rpc.fastnear.com",
  walletUrl: "https://testnet.mynearwallet.com/",
  helperUrl: "https://helper.testnet.near.org",
};

/**
 * Fetches the NEAR balance for an account from the blockchain
 * @param accountId The NEAR account ID
 * @returns Balance in NEAR (not yoctoNEAR)
 */
export async function fetchAccountBalance(accountId: string): Promise<string> {
  try {
    // Dynamically import near-api-js to avoid SSR issues
    const { connect, keyStores, utils } = await import("near-api-js");

    // Connect to NEAR
    const keyStore = new keyStores.InMemoryKeyStore();
    const near = await connect({
      ...NEAR_CONFIG,
      keyStore,
    });

    // Get account
    const account = await near.account(accountId);

    // Get account state which includes balance
    const accountState = await account.state();

    // Convert from yoctoNEAR to NEAR
    // 1 NEAR = 10^24 yoctoNEAR
    const balanceInNear = utils.format.formatNearAmount(accountState.amount);

    return balanceInNear;
  } catch (error) {
    console.error(`Error fetching balance for ${accountId}:`, error);
    throw error;
  }
}

/**
 * Fetches detailed account information including balance
 * @param accountId The NEAR account ID
 * @returns Account details
 */
export async function fetchAccountInfo(accountId: string) {
  try {
    const { connect, keyStores, utils } = await import("near-api-js");

    const keyStore = new keyStores.InMemoryKeyStore();
    const near = await connect({
      ...NEAR_CONFIG,
      keyStore,
    });

    const account = await near.account(accountId);
    const accountState = await account.state();

    return {
      accountId,
      balance: utils.format.formatNearAmount(accountState.amount),
      balanceYocto: accountState.amount,
      storageUsage: accountState.storage_usage,
      codeHash: accountState.code_hash,
      blockHeight: accountState.block_height,
      blockHash: accountState.block_hash,
    };
  } catch (error) {
    console.error(`Error fetching account info for ${accountId}:`, error);
    throw error;
  }
}
