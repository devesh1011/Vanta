"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoaderIcon, WalletIcon } from "./icons";
import { cn } from "@/lib/utils";

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { accountId, balance, isConnected, connect, disconnect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Button
        className={cn("h-8 px-2 md:h-fit md:px-3", className)}
        disabled={isConnecting}
        onClick={handleConnect}
        variant="outline"
      >
        {isConnecting ? (
          <>
            <div className="animate-spin">
              <LoaderIcon />
            </div>
            <span className="hidden md:inline">Connecting...</span>
          </>
        ) : (
          <>
            <WalletIcon />
            <span className="hidden md:inline">Connect Wallet</span>
          </>
        )}
      </Button>
    );
  }

  // Connected state - show dropdown with account info
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn("h-8 px-2 md:h-fit md:px-3", className)}
          variant="outline"
        >
          <WalletIcon />
          <span className="hidden md:inline truncate max-w-[120px]">
            {accountId}
          </span>
          {balance && (
            <span className="hidden lg:inline text-muted-foreground">
              {balance} NEAR
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Connected Account</p>
          <p className="text-xs text-muted-foreground truncate">{accountId}</p>
        </div>
        {balance && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Balance</p>
              <p className="text-xs text-muted-foreground">{balance} NEAR</p>
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={isDisconnecting}
          onSelect={handleDisconnect}
        >
          {isDisconnecting ? (
            <>
              <div className="animate-spin mr-2">
                <LoaderIcon size={14} />
              </div>
              Disconnecting...
            </>
          ) : (
            "Disconnect"
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
