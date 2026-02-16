// TypeScript interfaces for NEAR AI API

export interface NearAIProvider {
  chat(params: NearChatParams): Promise<NearChatResponse>;
  streamChat(params: NearChatParams): AsyncIterable<NearChatChunk>;
  listModels(): Promise<NearModel[]>;
  verifyResponse(responseId: string): Promise<VerificationResult>;
}

export interface NearChatParams {
  model: string;
  messages: NearMessage[];
  stream?: boolean;
  privateInference?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface NearMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface NearChatResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  verification?: {
    verified: boolean;
    attestation?: string;
  };
}

export interface NearChatChunk {
  id: string;
  delta: string;
  done: boolean;
  verification?: VerificationResult;
}

export interface NearModel {
  id: string;
  name: string;
  description: string;
  supportsPrivateInference: boolean;
  supportsVerification: boolean;
  contextWindow: number;
}

export interface VerificationResult {
  verified: boolean;
  attestation?: string;
  timestamp: string;
}

// NEAR AI API response types
export interface NearAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface NearAPIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export interface NearAPIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}
