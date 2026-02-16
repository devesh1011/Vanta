"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";
import { WalletConnectButton } from "@/components/wallet-connect-button";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 z-30 flex items-center bg-transparent px-2 py-1.5 md:px-3">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="ml-1 h-8 px-2 text-gray-800 hover:bg-gray-100 hover:text-black"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="ghost"
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      <div className="flex-1" />

      {/* Right-side controls matching index.html header */}
      <div className="flex items-center gap-3">
        <WalletConnectButton />

        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
          />
        )}

        <Button
          asChild
          className="h-8 bg-black px-3 text-white hover:bg-gray-800 md:h-fit md:px-3"
        >
          <Link href="/agents">
            <span className="text-sm">Agents</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
