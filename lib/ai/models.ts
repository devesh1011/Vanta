export const DEFAULT_CHAT_MODEL: string = "near-qwen-3";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "near-qwen-3",
    name: "NEAR Qwen 3 30B",
    description: "Multilingual model with privacy-preserving inference (NEAR AI)",
  },
  {
    id: "near-deepseek-v3",
    name: "NEAR DeepSeek V3.1",
    description: "Advanced reasoning model with privacy-preserving TEE (NEAR AI)",
  },
];
