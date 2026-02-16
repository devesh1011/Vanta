import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { nearAI } from "@/lib/ai/providers/near";
import { NearAIError } from "@/lib/ai/providers/near-errors";
import type { NearMessage } from "@/lib/ai/providers/near-types";
import { ChatSDKError } from "@/lib/errors";
import {
  createStreamId,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type NearChatRequest, nearChatRequestSchema } from "./schema";

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: NearChatRequest;

  try {
    const json = await request.json();
    requestBody = nearChatRequestSchema.parse(json);
  } catch (error) {
    console.error("Request body parsing error:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const { id, message, selectedModel, privateInference } = requestBody;

    console.log("NEAR AI chat request:", { id, selectedModel, privateInference });

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: "private",
      });
    }

    // Convert UI messages to NEAR AI format
    const nearMessages: NearMessage[] = convertToNearMessages([
      ...messagesFromDb,
      message,
    ]);

    // Save user message
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const assistantMessageId = generateUUID();
          let fullContent = "";
          let usage: any = null;

          // Send initial message start
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "message-start",
                id: assistantMessageId,
              })}\n\n`
            )
          );

          // Stream chat response from NEAR AI
          for await (const chunk of nearAI.streamChat({
            model: selectedModel,
            messages: nearMessages,
            stream: true,
            privateInference,
          })) {
            fullContent += chunk.delta;

            // Send text delta
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "text-delta",
                  delta: chunk.delta,
                })}\n\n`
              )
            );

            if (chunk.done) {
              // Send verification if available
              if (chunk.verification) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "verification",
                      data: chunk.verification,
                    })}\n\n`
                  )
                );
              }

              // Save assistant message
              await saveMessages({
                messages: [
                  {
                    chatId: id,
                    id: assistantMessageId,
                    role: "assistant",
                    parts: [{ type: "text", text: fullContent }],
                    attachments: [],
                    createdAt: new Date(),
                  },
                ],
              });

              // Send finish
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "finish",
                  })}\n\n`
                )
              );

              break;
            }
          }

          controller.close();
        } catch (error) {
          console.error("NEAR AI streaming error:", error);

          if (error instanceof NearAIError) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: {
                    code: error.code,
                    message: error.message,
                  },
                })}\n\n`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: {
                    code: "network_error",
                    message: "An error occurred while streaming the response",
                  },
                })}\n\n`
              )
            );
          }

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (error instanceof NearAIError) {
      console.error("NEAR AI error:", error);
      return Response.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      );
    }

    console.error("Unhandled error in NEAR chat API:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    console.error("Vercel ID:", vercelId);

    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  // Use existing deleteChatById from queries
  const { deleteChatById } = await import("@/lib/db/queries");
  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}

// Helper function to convert UI messages to NEAR AI format
function convertToNearMessages(messages: (DBMessage | ChatMessage)[]): NearMessage[] {
  return messages.map((msg) => {
    // Extract text content from parts
    const parts = msg.parts as any[];
    const textParts = parts.filter((part: any) => part.type === "text");
    const content = textParts.map((part: any) => part.text).join("\n");

    return {
      role: msg.role as "user" | "assistant" | "system",
      content,
    };
  });
}
