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
        className="h-8 px-3 !bg-cream !text-black border !border-black hover:!bg-black hover:!text-white md:h-fit md:px-3"
        disabled={isConnecting}
        onClick={handleConnect}
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
          className={cn(
            "h-8 px-2 md:h-fit md:px-3 !bg-cream !text-black border !border-black hover:!bg-black hover:!text-white",
            className,
          )}
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
      <DropdownMenuContent
        align="end"
        className="w-[240px] !bg-white !text-zinc-900 border-zinc-200"
      >
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Connected Account</p>
          <p className="text-xs text-zinc-500 truncate">{accountId}</p>
        </div>
        {balance && (
          <>
            <DropdownMenuSeparator className="bg-zinc-200" />
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Balance</p>
              <p className="text-xs text-zinc-500">{balance} NEAR</p>
            </div>
          </>
        )}
        <DropdownMenuSeparator className="bg-zinc-200" />
        <DropdownMenuItem
          className="cursor-pointer hover:!bg-zinc-100 focus:!bg-zinc-100 !text-zinc-900"
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
