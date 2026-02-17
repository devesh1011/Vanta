import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum([
    "chat-model",
    "chat-model-reasoning",
    "claude-flash",
    "claude-sonnet",
    "claude-sonnet-4-5",
    "claude-opus",
    "near-deepseek-v3",
    "near-glm-4",
    "near-gpt-oss",
    "near-qwen-3",
  ]),
  selectedVisibilityType: z.enum(["public", "private"]),
  walletAccountId: z.string().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
