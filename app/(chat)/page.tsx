import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  // Validate that the model from cookie still exists
  const validModelIds = chatModels.map((m) => m.id);
  const initialModel =
    modelIdFromCookie && validModelIds.includes(modelIdFromCookie.value)
      ? modelIdFromCookie.value
      : DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={initialModel}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
