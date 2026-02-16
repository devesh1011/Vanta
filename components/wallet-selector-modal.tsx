"use client";

/**
 * WalletSelectorModal Component
 * 
 * This component provides a wrapper around the NEAR wallet-selector modal.
 * The actual wallet selection UI is provided by the @near-wallet-selector/modal-ui
 * package, which displays available wallet providers (MyNearWallet, Meteor, Sender)
 * and handles the connection flow.
 * 
 * This component can be used to:
 * - Display error messages if wallet connection fails
 * - Show loading states
 * - Provide additional context or instructions to users
 */

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoaderIcon } from "./icons";

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletConnected?: (accountId: string) => void;
  error?: string | null;
}

/**
 * WalletSelectorModal
 * 
 * Note: The actual wallet provider selection is handled by the wallet-selector
 * library's built-in modal UI. This component serves as a wrapper for error
 * handling and additional UI states.
 * 
 * The wallet providers (MyNearWallet, Meteor Wallet, Sender) are configured
 * in the WalletContext and displayed automatically by the wallet-selector modal.
 */
export function WalletSelectorModal({
  isOpen,
  onClose,
  onWalletConnected,
  error,
}: WalletSelectorModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConnecting(true);
    } else {
      setIsConnecting(false);
    }
  }, [isOpen]);

  // If there's an error, show error dialog
  if (error) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Connection Failed</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>{error}</p>
              <p className="text-sm">
                Please try again or select a different wallet provider.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Show connecting state
  if (isConnecting && isOpen) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Connecting Wallet</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin">
                  <LoaderIcon size={32} />
                </div>
              </div>
              <p className="text-center">
                Please select a wallet provider and approve the connection...
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}

/**
 * Wallet Provider Information
 * 
 * The following wallet providers are supported and configured in the WalletContext:
 * 
 * 1. MyNearWallet (https://mynearwallet.com)
 *    - Official NEAR wallet
 *    - Web-based wallet
 *    - Supports testnet and mainnet
 * 
 * 2. Meteor Wallet (https://meteorwallet.app)
 *    - Browser extension wallet
 *    - Fast and secure
 *    - Supports multiple accounts
 * 
 * 3. Sender Wallet (https://sender.org)
 *    - Browser extension wallet
 *    - Multi-chain support
 *    - User-friendly interface
 * 
 * The wallet-selector library automatically detects which wallets are available
 * (e.g., if the user has browser extensions installed) and displays them in the
 * modal UI.
 */
