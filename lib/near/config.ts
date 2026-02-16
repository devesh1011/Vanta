/**
 * NEAR Network Configuration
 * 
 * This file contains configuration for connecting to NEAR blockchain networks.
 * By default, it uses testnet for safe development and testing.
 */

export interface NearConfig {
  networkId: "testnet" | "mainnet";
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  explorerUrl: string;
}

/**
 * Get NEAR configuration based on environment
 * Defaults to testnet for safety
 */
export function getNearConfig(): NearConfig {
  const network = (process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet") as "testnet" | "mainnet";
  
  if (network === "mainnet") {
    return {
      networkId: "mainnet",
      nodeUrl: process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://rpc.mainnet.near.org",
      walletUrl: "https://app.mynearwallet.com",
      helperUrl: "https://helper.mainnet.near.org",
      explorerUrl: "https://nearblocks.io",
    };
  }
  
  // Default to testnet
  return {
    networkId: "testnet",
    nodeUrl: process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://test.rpc.fastnear.com",
    walletUrl: "https://testnet.mynearwallet.com",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://testnet.nearblocks.io",
  };
}

/**
 * Default NEAR configuration (testnet)
 */
export const nearConfig = getNearConfig();
