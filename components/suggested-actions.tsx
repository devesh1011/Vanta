"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const suggestedActions = [
    "Check address balance",
    "Swap Near to another token",
    "Send Near to another address",
  ];

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-2.5"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index, duration: 0.5 }}
        >
          <button
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-black active:scale-95"
            onClick={() => {
              window.history.replaceState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestedAction }],
              });
            }}
            type="button"
          >
            {suggestedAction}
          </button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  },
);
