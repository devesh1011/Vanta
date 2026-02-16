/**
 * Token Registry for Ref Finance
 * 
 * Contains token metadata for supported tokens on testnet and mainnet
 */

export interface TokenMetadata {
  id: string;           // Token contract address
  symbol: string;       // Display symbol (NEAR, USDT, USDC)
  decimals: number;     // Token decimals
  icon?: string;        // Optional icon URL
}

/**
 * Token registry by network
 */
export const TOKENS: Record<string, Record<string, TokenMetadata>> = {
  testnet: {
    NEAR: {
      id: "wrap.testnet",
      symbol: "NEAR",
      decimals: 24,
    },
    WNEAR: {
      id: "wrap.testnet",
      symbol: "wNEAR",
      decimals: 24,
    },
    USDT: {
      id: "usdt.fakes.testnet",
      symbol: "USDT",
      decimals: 6,
    },
    USDC: {
      id: "usdc.fakes.testnet",
      symbol: "USDC",
      decimals: 6,
    },
  },
  mainnet: {
    NEAR: {
      id: "wrap.near",
      symbol: "NEAR",
      decimals: 24,
    },
    WNEAR: {
      id: "wrap.near",
      symbol: "wNEAR",
      decimals: 24,
    },
    USDT: {
      id: "usdt.tether-token.near",
      symbol: "USDT",
      decimals: 6,
    },
    USDC: {
      id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      symbol: "USDC",
      decimals: 6,
    },
  },
};

/**
 * Get token metadata by symbol and network
 */
export function getTokenMetadata(
  symbol: string,
  network: "testnet" | "mainnet"
): TokenMetadata | undefined {
  const upperSymbol = symbol.toUpperCase();
  return TOKENS[network]?.[upperSymbol];
}

/**
 * Get all supported token symbols for a network
 */
export function getSupportedTokens(network: "testnet" | "mainnet"): string[] {
  return Object.keys(TOKENS[network] || {});
}

/**
 * Check if a token is supported on a network
 */
export function isTokenSupported(
  symbol: string,
  network: "testnet" | "mainnet"
): boolean {
  const upperSymbol = symbol.toUpperCase();
  return upperSymbol in (TOKENS[network] || {});
}
