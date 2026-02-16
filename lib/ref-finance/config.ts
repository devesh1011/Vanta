/**
 * Ref Finance Configuration
 * 
 * Configuration for Ref Finance DEX contracts on different networks
 */

export interface RefConfig {
  contractId: string;
  networkId: "testnet" | "mainnet";
}

/**
 * Get Ref Finance configuration based on network
 */
export function getRefConfig(network: "testnet" | "mainnet"): RefConfig {
  if (network === "mainnet") {
    return {
      contractId: "v2.ref-finance.near",
      networkId: "mainnet",
    };
  }
  
  // Default to testnet
  return {
    contractId: "ref-finance-101.testnet",
    networkId: "testnet",
  };
}
