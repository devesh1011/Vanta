"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { myProvider } from "@/lib/ai/providers";
import { titlePrompt } from "@/lib/ai/prompts";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const promptText = getTextFromMessage(message)?.trim() || "New chat";

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return promptText.slice(0, 80);
  }

  try {
    const { text: title } = await generateText({
      model: myProvider.languageModel("title-model"),
      system: titlePrompt,
      prompt: promptText,
    });

    return (title || promptText).trim().slice(0, 80);
  } catch {
    return promptText.slice(0, 80);
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
}
