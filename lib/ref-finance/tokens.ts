/**
 * Token Registry for Ref Finance
 *
 * Contains token metadata for supported tokens on testnet and mainnet
 */

export interface TokenMetadata {
  id: string; // Token contract address
  symbol: string; // Display symbol (NEAR, USDT, USDC)
  decimals: number; // Token decimals
  icon?: string; // Optional icon URL
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
 * Common LLM truncations / typos → canonical token symbol.
 * The Qwen model on vLLM frequently outputs "US" instead of "USDT",
 * "USD" for either stablecoin, "W" for "WNEAR", etc.
 */
const TOKEN_ALIASES: Record<string, string> = {
  US: "USDT",
  USD: "USDT",
  TETHER: "USDT",
  "USDT.E": "USDT",
  "USDC.E": "USDC",
  W: "WNEAR",
  WNEAR: "WNEAR",
  WRAP: "WNEAR",
  "WRAPPED NEAR": "WNEAR",
  NR: "NEAR",
  NEA: "NEAR",
};

/**
 * Normalize a (possibly truncated / malformed) token symbol to a
 * canonical symbol that exists in the token registry.
 *
 * Returns the canonical symbol if a match is found, otherwise
 * returns the original symbol uppercased.
 */
export function normalizeTokenSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  // Direct match in any network's registry
  if (TOKENS.testnet[upper] || TOKENS.mainnet[upper]) return upper;
  // Alias lookup
  if (TOKEN_ALIASES[upper]) return TOKEN_ALIASES[upper];
  // Prefix match: e.g. "USD" could match "USDT" — pick shortest symbol
  const allSymbols = [
    ...new Set([
      ...Object.keys(TOKENS.testnet),
      ...Object.keys(TOKENS.mainnet),
    ]),
  ];
  const prefixMatch = allSymbols
    .filter((s) => s.startsWith(upper) || upper.startsWith(s))
    .sort((a, b) => a.length - b.length);
  if (prefixMatch.length > 0) return prefixMatch[0];
  return upper;
}

/**
 * Get token metadata by symbol and network
 */
export function getTokenMetadata(
  symbol: string,
  network: "testnet" | "mainnet",
): TokenMetadata | undefined {
  const upperSymbol = normalizeTokenSymbol(symbol);
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
  network: "testnet" | "mainnet",
): boolean {
  const normalized = normalizeTokenSymbol(symbol);
  return normalized in (TOKENS[network] || {});
}
