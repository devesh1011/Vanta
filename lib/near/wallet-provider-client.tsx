"use client";

/**
 * Client-only Wallet Provider Wrapper
 * This ensures WalletProvider only renders on the client to avoid SSR issues
 */

import { useEffect, useState } from "react";
import { WalletProvider } from "./wallet-context";

export function WalletProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return <WalletProvider>{children}</WalletProvider>;
}
