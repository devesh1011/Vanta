# Ref Finance Integration

## Current Status: Working Implementation ✅

This directory contains a **working implementation** of Ref Finance token swap functionality using direct smart contract calls.

### What Works
- ✅ Correct transaction format (`ft_transfer_call`)
- ✅ Proper message structure for Ref Finance
- ✅ Gas and deposit amounts
- ✅ **Pool Discovery**: Automatically finds the right pool for token pairs
- ✅ **Real Swap Estimation**: Queries Ref Finance for actual swap rates
- ✅ **Slippage Protection**: 1% slippage tolerance

### Limitations
- ⚠️ **Single-hop Only**: Only supports direct swaps (token A → token B). Multi-hop routing (A → B → C) not implemented
- ⚠️ **Simple Pools**: Works with basic pools, may not handle all pool types
- ⚠️ **Price Impact**: Uses simplified calculation

## Why Not Use @ref-finance/ref-sdk?

The official `@ref-finance/ref-sdk` package is designed for Node.js environments and imports Node.js-specific modules (`fs`, `net`, `tls`) that are not available in browsers. This makes it incompatible with client-side Next.js applications.

## Current Implementation

The current code:
- ✅ Validates token symbols and amounts
- ✅ Provides the correct UI/UX flow (estimate → confirm → execute)
- ✅ Integrates with wallet for transaction signing
- ⚠️ Uses mock swap estimates (not real Ref Finance data)
- ⚠️ Generates placeholder transactions (won't execute real swaps)

## For Production Use

To implement real Ref Finance swaps, you have several options:

### Option 1: Direct Smart Contract Calls (Recommended)

Interact directly with Ref Finance smart contracts using `near-api-js`:

```typescript
// 1. Find the right pool for the token pair
const pools = await contract.get_pools({
  from_index: 0,
  limit: 100
});

// 2. Get swap estimate
const estimate = await contract.get_return({
  pool_id: poolId,
  token_in: tokenInId,
  amount_in: amountIn,
  token_out: tokenOutId
});

// 3. Execute swap
const actions = [
  {
    pool_id: poolId,
    token_in: tokenInId,
    token_out: tokenOutId,
    amount_in: amountIn,
    min_amount_out: minAmountOut
  }
];
```

### Option 2: Backend Service

Create a backend API that uses `@ref-finance/ref-sdk`:

```
Client → Your Backend API → Ref SDK → NEAR Blockchain
```

Your backend would:
1. Accept swap requests from the client
2. Use the Ref SDK to calculate estimates and generate transactions
3. Return transaction data to the client for wallet signing

### Option 3: Alternative DEX

Consider using a DEX with better browser support, such as:
- Jumbo Exchange
- Trisolaris
- Or implement direct AMM calculations

## Resources

- [Ref Finance Docs](https://guide.ref.finance/)
- [Ref Finance Contracts](https://github.com/ref-finance/ref-contracts)
- [NEAR API JS](https://docs.near.org/tools/near-api-js/quick-reference)

## Testing the Demo

You can test the current implementation to see the UI flow:

1. Connect your NEAR wallet
2. Say "swap 0.1 NEAR to USDT"
3. The AI will show a mock estimate
4. Confirm the swap
5. A placeholder transaction will be sent to your wallet

**Note**: The transaction will likely fail on-chain because it's not a valid Ref Finance swap transaction.
