import { generateText } from "ai";
import { createNearAI } from "@/lib/ai/providers/near-ai-sdk";

const nearAI = createNearAI({
  apiKey: process.env.NEAR_AI_API_KEY,
  endpoint: process.env.NEAR_AI_ENDPOINT,
});

const REF_FINANCE_TOKEN_API =
  "https://testnet-indexer.ref-finance.com/list-token-price";
const REF_FINANCE_CONTRACT = "v2.ref-finance.testnet";
const WRAP_NEAR_TOKEN = "wrap.testnet";

export interface TokenInfo {
  token_account_id: string;
  symbol: string;
  price: string;
  decimal: number;
}

export interface TokenPrediction {
  selectedToken: string;
  symbol: string;
  reasoning: string;
  confidence: number;
  price: string;
}

/**
 * Check if a liquidity pool exists between wNEAR and the target token
 */
async function hasLiquidityPool(tokenId: string): Promise<boolean> {
  try {
    // Dynamically import near-api-js to avoid SSR issues
    const { providers } = await import("near-api-js");

    const provider = new providers.JsonRpcProvider({
      url: "https://test.rpc.fastnear.com",
    });

    // Get number of pools
    const numPoolsResult = (await provider.query({
      request_type: "call_function",
      finality: "final",
      account_id: REF_FINANCE_CONTRACT,
      method_name: "get_number_of_pools",
      args_base64: "",
    })) as any;

    const numPools = JSON.parse(Buffer.from(numPoolsResult.result).toString());

    // Check first 200 pools (most liquid pools are at the beginning)
    const batchSize = 100;
    for (let i = 0; i < Math.min(numPools, 200); i += batchSize) {
      const poolsResult = (await provider.query({
        request_type: "call_function",
        finality: "final",
        account_id: REF_FINANCE_CONTRACT,
        method_name: "get_pools",
        args_base64: Buffer.from(
          JSON.stringify({
            from_index: i,
            limit: batchSize,
          }),
        ).toString("base64"),
      })) as any;

      const pools = JSON.parse(Buffer.from(poolsResult.result).toString());

      // Check if any pool has both wNEAR and our target token
      for (const pool of pools) {
        const hasWNear = pool.token_account_ids.includes(WRAP_NEAR_TOKEN);
        const hasTargetToken = pool.token_account_ids.includes(tokenId);

        if (hasWNear && hasTargetToken) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`Error checking liquidity for ${tokenId}:`, error);
    return false; // Assume no liquidity on error
  }
}

/**
 * Fetches available tokens from Ref Finance and filters for liquidity
 * @returns Array of token information with available liquidity pools
 */
export async function fetchAvailableTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch(REF_FINANCE_TOKEN_API);

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.statusText}`);
    }

    const data = await response.json();

    // Filter out tokens without prices
    const allTokens = Object.entries(data)
      .map(([token_account_id, info]: [string, any]) => ({
        token_account_id,
        symbol: info.symbol || token_account_id.split(".")[0].toUpperCase(),
        price: info.price || "0",
        decimal: info.decimal || 18,
      }))
      .filter((token) => parseFloat(token.price) > 0)
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

    console.log(`🔍 Found ${allTokens.length} tokens with prices`);

    // Filter tokens that have liquidity pools with wNEAR
    const tokensWithLiquidity: TokenInfo[] = [];

    for (const token of allTokens.slice(0, 30)) {
      // Check top 30 tokens
      if (token.token_account_id === WRAP_NEAR_TOKEN) {
        continue; // Skip wNEAR itself
      }

      const hasLiquidity = await hasLiquidityPool(token.token_account_id);
      if (hasLiquidity) {
        tokensWithLiquidity.push(token);
        console.log(`✅ ${token.symbol} has liquidity pool`);
      } else {
        console.log(`❌ ${token.symbol} has NO liquidity pool`);
      }

      // Stop after finding 15 tokens with liquidity
      if (tokensWithLiquidity.length >= 15) {
        break;
      }
    }

    console.log(
      `🔍 Found ${tokensWithLiquidity.length} tokens with liquidity pools`,
    );

    // If no tokens with liquidity found, use fallback
    if (tokensWithLiquidity.length === 0) {
      console.warn(
        "⚠️ No tokens with liquidity found, using fallback token list",
      );
      return await loadFallbackTokens();
    }

    return tokensWithLiquidity;
  } catch (error) {
    console.error("❌ Error fetching tokens from API:", error);
    console.log("📦 Using fallback token list");
    return await loadFallbackTokens();
  }
}

/**
 * Load fallback token list from static file
 */
async function loadFallbackTokens(): Promise<TokenInfo[]> {
  try {
    const fallbackData = await import("./testnet-tokens-fallback.json");
    const tokens = Object.entries(fallbackData.default || fallbackData)
      .map(([token_account_id, info]: [string, any]) => ({
        token_account_id,
        symbol: info.symbol,
        price: info.price,
        decimal: info.decimal,
      }))
      .filter((token) => parseFloat(token.price) > 0)
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 15);

    console.log(`📦 Loaded ${tokens.length} tokens from fallback list`);
    return tokens;
  } catch (error) {
    console.error("❌ Failed to load fallback tokens:", error);
    // Return a minimal set of known tokens
    return [
      {
        token_account_id: "wbtc.fakes.testnet",
        symbol: "WBTC",
        price: "101700",
        decimal: 8,
      },
      {
        token_account_id: "usdt.fakes.testnet",
        symbol: "USDT.e",
        price: "0.999892",
        decimal: 6,
      },
      {
        token_account_id: "dai.fakes.testnet",
        symbol: "DAI",
        price: "0.999892",
        decimal: 18,
      },
    ];
  }
}

/**
 * Uses AI to analyze tokens and predict the best one for investment
 * @param tokens Available tokens
 * @param agentGoal Agent's investment goal
 * @returns Token prediction with reasoning
 */
export async function predictBestToken(
  tokens: TokenInfo[],
  agentGoal: string,
): Promise<TokenPrediction> {
  const tokenList = tokens
    .map((t) => `- ${t.symbol} (${t.token_account_id}): $${t.price}`)
    .join("\n");

  const prompt = `You are an AI investment advisor analyzing tokens on NEAR Protocol's Ref Finance DEX.

CRITICAL: In your JSON response, "selectedToken" MUST be the full token_account_id (like "usdt.fakes.testnet"), NOT just the symbol. You can use either the token_account_id OR the symbol - the system will map it correctly.

IMPORTANT: You MUST follow the user's instructions in the Agent Goal exactly. If they ask for a "stable token", you MUST select a stablecoin (USDT, USDC, DAI, etc.). If they specify a token type or characteristic, prioritize that above all else.

Agent Goal: ${agentGoal}

Available Tokens:
${tokenList}

Based on the agent's goal and the available tokens, analyze and select THE BEST SINGLE TOKEN that matches the user's requirements.

Selection Priority:
1. **FOLLOW USER INSTRUCTIONS** - If they specify "stable token", "high growth", "low risk", etc., this is your PRIMARY constraint
2. Alignment with the agent's goal and requirements
3. Token availability and liquidity
4. Price and potential for growth
5. Risk vs reward

Common Token Types:
- Stablecoins (stable value): USDT, USDC, DAI, USN, BUSD
- Wrapped assets: wBTC, wETH, wNEAR
- Native tokens: NEAR, REF, etc.

Respond in JSON format with:
{
  "selectedToken": "token_account_id_or_symbol",
  "symbol": "TOKEN_SYMBOL",
  "reasoning": "Detailed explanation of why this token was selected and how it matches the user's requirements",
  "confidence": 0.85,
  "price": "current_price"
}

Return ONLY valid JSON, no other text.`;

  try {
    const result = await generateText({
      model: nearAI("Qwen/Qwen3-30B-A3B-Instruct-2507"),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent JSON output
    });

    // Parse the JSON response
    const text = result.text.trim();
    console.log("🤖 AI Response:", text);

    // Extract JSON from markdown code blocks if present
    let jsonText = text;
    if (text.includes("```json")) {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1].trim();
      }
    } else if (text.includes("```")) {
      const match = text.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1].trim();
      }
    }

    // Try to find JSON object in the text if no code blocks
    if (jsonText === text && !jsonText.startsWith("{")) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    console.log("🤖 Extracted JSON:", jsonText);
    const prediction = JSON.parse(jsonText) as TokenPrediction;

    // Validate the prediction
    if (!prediction.selectedToken || !prediction.reasoning) {
      throw new Error("Invalid prediction format: missing required fields");
    }

    // CRITICAL FIX: Ensure selectedToken is the token_account_id, not the symbol
    // If the AI returned a symbol instead of token_account_id, map it back
    const matchingToken = tokens.find(
      (t) =>
        t.token_account_id === prediction.selectedToken ||
        t.symbol === prediction.selectedToken,
    );

    if (!matchingToken) {
      throw new Error(
        `Selected token "${prediction.selectedToken}" not found in available tokens`,
      );
    }

    // Ensure we use the token_account_id
    prediction.selectedToken = matchingToken.token_account_id;
    prediction.symbol = matchingToken.symbol;
    prediction.price = matchingToken.price;

    console.log("🤖 Token prediction successful:", prediction.symbol);
    console.log("🤖 Token account ID:", prediction.selectedToken);
    return prediction;
  } catch (error) {
    console.error("❌ Error predicting token:", error);
    console.error(
      "❌ Error details:",
      error instanceof Error ? error.message : "Unknown error",
    );

    // Fallback logic: Analyze user instructions and select appropriate token
    let fallbackToken = tokens[0];
    let fallbackReasoning =
      "Selected based on highest price and liquidity. This is a fallback selection due to AI analysis error.";

    const goalLower = agentGoal.toLowerCase();

    // Priority 1: Check for stable token requirement
    if (goalLower.includes("stable")) {
      const stablecoins = ["usdt", "usdc", "dai", "usn", "busd"];
      const stablecoin = tokens.find((t) =>
        stablecoins.some((stable) => t.symbol.toLowerCase().includes(stable)),
      );

      if (stablecoin) {
        fallbackToken = stablecoin;
        fallbackReasoning = `Selected ${stablecoin.symbol} as a stable token based on user instruction for stable tokens. This is a fallback selection due to AI analysis error.`;
        console.log("🤖 Using stablecoin fallback:", stablecoin.symbol);
      } else {
        console.warn(
          "⚠️ User requested stable token but none found in available tokens",
        );
      }
    }
    // Priority 2: Check for specific token mentions
    else if (goalLower.includes("btc") || goalLower.includes("bitcoin")) {
      const btcToken = tokens.find((t) =>
        t.symbol.toLowerCase().includes("btc"),
      );
      if (btcToken) {
        fallbackToken = btcToken;
        fallbackReasoning = `Selected ${btcToken.symbol} based on user mention of BTC/Bitcoin. This is a fallback selection due to AI analysis error.`;
        console.log("🤖 Using BTC fallback:", btcToken.symbol);
      }
    } else if (goalLower.includes("eth") || goalLower.includes("ethereum")) {
      const ethToken = tokens.find((t) =>
        t.symbol.toLowerCase().includes("eth"),
      );
      if (ethToken) {
        fallbackToken = ethToken;
        fallbackReasoning = `Selected ${ethToken.symbol} based on user mention of ETH/Ethereum. This is a fallback selection due to AI analysis error.`;
        console.log("🤖 Using ETH fallback:", ethToken.symbol);
      }
    }

    console.log("🤖 Using fallback token:", fallbackToken.symbol);
    return {
      selectedToken: fallbackToken.token_account_id,
      symbol: fallbackToken.symbol,
      reasoning: fallbackReasoning,
      confidence: 0.5,
      price: fallbackToken.price,
    };
  }
}
