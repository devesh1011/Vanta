"use client";

/**
 * Custom hooks for NEAR wallet state management
 * 
 * These hooks provide convenient access to wallet state and functionality
 * throughout the application.
 */

import { useWalletContext } from "@/lib/near/wallet-context";
import type { WalletContextValue } from "@/lib/near/types";

/**
 * Hook to access the full wallet context
 * 
 * Provides access to all wallet state and methods including:
 * - wallet: WalletSelector instance
 * - accountId: Connected account ID
 * - balance: Account balance in NEAR
 * - isConnected: Connection status
 * - connect: Function to connect wallet
 * - disconnect: Function to disconnect wallet
 * - signAndSendTransaction: Function to sign and send transactions
 * - refreshBalance: Function to refresh balance
 * 
 * @returns Full wallet context value
 * @throws Error if used outside WalletProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { accountId, balance, connect, disconnect } = useWallet();
 *   
 *   return (
 *     <div>
 *       {accountId ? (
 *         <div>
 *           <p>Connected: {accountId}</p>
 *           <p>Balance: {balance} NEAR</p>
 *           <button onClick={disconnect}>Disconnect</button>
 *         </div>
 *       ) : (
 *         <button onClick={connect}>Connect Wallet</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet(): WalletContextValue {
  return useWalletContext();
}

/**
 * Hook to access wallet balance
 * 
 * Provides the current account balance and a function to refresh it.
 * Returns null for balance if no wallet is connected.
 * 
 * @returns Object containing balance and refresh function
 * 
 * @example
 * ```tsx
 * function BalanceDisplay() {
 *   const { balance, refreshBalance } = useWalletBalance();
 *   
 *   return (
 *     <div>
 *       <p>Balance: {balance || "Not connected"} NEAR</p>
 *       <button onClick={refreshBalance}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWalletBalance() {
  const { balance, refreshBalance } = useWalletContext();
  
  return {
    balance,
    refreshBalance,
  };
}

/**
 * Hook to access wallet connection status
 * 
 * Provides connection state, account ID, and connection/disconnection functions.
 * Useful for components that only need to manage connection state.
 * 
 * @returns Object containing connection state and methods
 * 
 * @example
 * ```tsx
 * function ConnectionStatus() {
 *   const { isConnected, accountId, connect, disconnect } = useWalletConnection();
 *   
 *   return (
 *     <div>
 *       <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
 *       {isConnected && <p>Account: {accountId}</p>}
 *       <button onClick={isConnected ? disconnect : connect}>
 *         {isConnected ? "Disconnect" : "Connect"}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWalletConnection() {
  const { isConnected, accountId, connect, disconnect } = useWalletContext();
  
  return {
    isConnected,
    accountId,
    connect,
    disconnect,
  };
}
