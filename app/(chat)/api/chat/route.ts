import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  InvalidToolInputError,
  JsonToSseTransformStream,
  NoSuchToolError,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { anthropic } from "@ai-sdk/anthropic";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { claudeAccountSkills } from "@/lib/ai/skills";
import { sendNearTokens } from "@/lib/ai/tools/send-near-tokens";
import { checkBalance } from "@/lib/ai/tools/check-balance";
import { getAccountInfo } from "@/lib/ai/tools/get-account-info";
import { swapTokens } from "@/lib/ai/tools/swap-tokens";
import { wrapNear, unwrapNear } from "@/lib/ai/tools/wrap-near";
import { normalizeTokenSymbol } from "@/lib/ref-finance/tokens";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err,
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 }, // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL",
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error("Request body parsing error:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      walletAccountId,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      walletAccountId?: string;
    } = requestBody;

    console.log("Selected chat model:", selectedChatModel);

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
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      // New chat - no need to fetch messages, it's empty
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

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

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log("About to call streamText with model:", selectedChatModel);
        const model = myProvider.languageModel(selectedChatModel);
        console.log("Model instance:", model);

        // Check if this is a NEAR AI model
        const isNearAI = selectedChatModel.startsWith("near-");
        if (isNearAI) {
          console.log("🔵 NEAR AI model detected:", selectedChatModel);
        }

        // Log tools configuration
        const toolsConfig = {
          sendNearTokens: sendNearTokens({ session, dataStream }),
          checkBalance: checkBalance({ session, dataStream }),
          getAccountInfo,
          swapTokens: swapTokens({ session, dataStream }),
          wrapNear: wrapNear({ session, dataStream }),
          unwrapNear: unwrapNear({ session, dataStream }),
          // Add code_execution tool for Claude models (required for skills)
          ...(selectedChatModel.startsWith("claude") && {
            code_execution: anthropic.tools.codeExecution_20250825(),
          }),
        };

        const activeTools =
          selectedChatModel === "chat-model-reasoning"
            ? []
            : selectedChatModel.startsWith("claude")
              ? [
                  "sendNearTokens",
                  "checkBalance",
                  "getAccountInfo",
                  "swapTokens",
                  "wrapNear",
                  "unwrapNear",
                  "code_execution",
                ]
              : [
                  "sendNearTokens",
                  "checkBalance",
                  "getAccountInfo",
                  "swapTokens",
                  "wrapNear",
                  "unwrapNear",
                ];

        console.log("🔧 Tools configuration:");
        console.log("  Available tools:", Object.keys(toolsConfig));
        console.log("  Active tools:", activeTools);
        const lastMsg = uiMessages[uiMessages.length - 1];
        const lastMsgPart = lastMsg?.parts?.[0];
        console.log(
          "  Last user message:",
          lastMsgPart && "text" in lastMsgPart
            ? lastMsgPart.text
            : "(non-text)",
        );

        const result = streamText({
          model,
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            walletAccountId,
          }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(10),
          experimental_activeTools: activeTools,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: toolsConfig,
          // Add skills for Claude models via providerOptions
          ...(selectedChatModel.startsWith("claude") && {
            providerOptions: {
              anthropic: {
                container: {
                  skills: claudeAccountSkills,
                },
              },
            },
          }),
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          // Repair malformed tool calls from NEAR AI / vLLM
          ...(isNearAI && {
            experimental_repairToolCall: async ({
              toolCall,
              tools: availableTools,
              error,
            }) => {
              if (NoSuchToolError.isInstance(error)) {
                return null; // can't fix an unknown tool name
              }

              console.log(
                "🔧 Repairing tool call:",
                toolCall.toolName,
                "input:",
                toolCall.input,
                "error:",
                error.message,
              );

              // Try to extract valid JSON from the (possibly garbled) input
              let parsed: Record<string, unknown> | null = null;
              try {
                parsed = JSON.parse(toolCall.input);
              } catch {
                // Try to find the last complete JSON object inside the string
                const matches = toolCall.input.match(/\{[^{}]*\}/g);
                if (matches && matches.length > 0) {
                  try {
                    parsed = JSON.parse(matches[matches.length - 1]);
                  } catch {
                    /* no salvageable JSON */
                  }
                }
              }

              if (!parsed) return null;

              // For swap tool: normalize truncated token symbols and infer missing toToken
              if (toolCall.toolName === "swapTokens") {
                if (parsed.fromToken) {
                  parsed.fromToken = normalizeTokenSymbol(
                    String(parsed.fromToken),
                  );
                }
                if (parsed.toToken) {
                  parsed.toToken = normalizeTokenSymbol(String(parsed.toToken));
                }
                // If toToken is still missing, infer from user message
                if (!parsed.toToken) {
                  const lastUserMsg =
                    uiMessages[uiMessages.length - 1]?.parts?.[0];
                  const userText =
                    lastUserMsg && "text" in lastUserMsg
                      ? lastUserMsg.text
                      : "";
                  const tokens = ["USDT", "USDC", "NEAR", "wNEAR"];
                  const fromUpper = String(
                    parsed.fromToken ?? "",
                  ).toUpperCase();
                  const inferred = tokens.find(
                    (t) =>
                      t !== fromUpper && userText.toUpperCase().includes(t),
                  );
                  if (inferred) {
                    parsed.toToken = inferred;
                    console.log("🔧 Inferred missing toToken:", inferred);
                  }
                }
                console.log("🔧 Repaired swap args:", JSON.stringify(parsed));
              }

              return {
                ...toolCall,
                input: JSON.stringify(parsed),
              };
            },
          }),
          onStepFinish: ({ finishReason, toolCalls, text }) => {
            console.log("🔧 Step finished:", finishReason);
            if (toolCalls.length > 0) {
              console.log(
                "🔧 Tool calls:",
                toolCalls.map((tc) => tc.toolName),
              );
            }
            if (text) {
              console.log("🔧 Text generated:", text.slice(0, 120));
            }
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        const uiStream = result.toUIMessageStream({
          sendReasoning: true,
        });

        dataStream.merge(uiStream);
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests",
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    // Log detailed error for debugging
    console.error("Unhandled error in chat API:", error);
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

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
