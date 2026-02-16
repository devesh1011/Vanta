// NEAR AI Provider implementation

import { NearAIError } from "./near-errors";
import type {
  NearAIProvider,
  NearAPIModelsResponse,
  NearAPIResponse,
  NearAPIStreamChunk,
  NearChatChunk,
  NearChatParams,
  NearChatResponse,
  NearMessage,
  NearModel,
  VerificationResult,
} from "./near-types";

const NEAR_AI_ENDPOINT = process.env.NEAR_AI_ENDPOINT || "https://cloud-api.near.ai/v1";
const NEAR_AI_API_KEY = process.env.NEAR_AI_API_KEY;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

class NearAI implements NearAIProvider {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey?: string, endpoint?: string) {
    this.apiKey = apiKey || NEAR_AI_API_KEY || "";
    this.endpoint = endpoint || NEAR_AI_ENDPOINT;

    if (!this.apiKey) {
      console.warn("NEAR AI API key is not configured");
    }
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new NearAIError("api_key_missing");
    }
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof NearAIError &&
          (error.code === "api_key_invalid" ||
            error.code === "api_key_missing" ||
            error.code === "invalid_request")
        ) {
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, i);

        // Wait before retrying
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new NearAIError("network_error");
  }

  async chat(params: NearChatParams): Promise<NearChatResponse> {
    this.validateApiKey();

    return this.retryWithBackoff(async () => {
      try {
        const response = await fetch(`${this.endpoint}/chat/completions`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: params.model,
            messages: params.messages,
            stream: false,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
          }),
        });

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        const data: NearAPIResponse = await response.json();

        return {
          id: data.id,
          model: data.model,
          content: data.choices[0]?.message?.content || "",
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
        };
      } catch (error) {
        if (error instanceof NearAIError) {
          throw error;
        }
        throw new NearAIError("network_error", undefined, error);
      }
    });
  }

  async *streamChat(params: NearChatParams): AsyncIterable<NearChatChunk> {
    this.validateApiKey();

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          stream: true,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
        }),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new NearAIError("network_error", "No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine === "data: [DONE]") {
            continue;
          }

          if (trimmedLine.startsWith("data: ")) {
            try {
              const jsonStr = trimmedLine.slice(6);
              const chunk: NearAPIStreamChunk = JSON.parse(jsonStr);

              const delta = chunk.choices[0]?.delta?.content || "";
              const done = chunk.choices[0]?.finish_reason !== null;

              yield {
                id: chunk.id,
                delta,
                done,
              };

              if (done) {
                return;
              }
            } catch (parseError) {
              console.error("Error parsing SSE chunk:", parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof NearAIError) {
        throw error;
      }
      throw new NearAIError("network_error", undefined, error);
    }
  }

  async listModels(): Promise<NearModel[]> {
    this.validateApiKey();

    return this.retryWithBackoff(async () => {
      try {
        const response = await fetch(`${this.endpoint}/models`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        const data: NearAPIModelsResponse = await response.json();

        // Map NEAR AI models to our model format
        // Note: NEAR AI API may not provide all metadata, so we use defaults
        return data.data.map((model) => ({
          id: model.id,
          name: this.formatModelName(model.id),
          description: `NEAR AI model: ${model.id}`,
          supportsPrivateInference: true, // NEAR AI supports private inference
          supportsVerification: true, // NEAR AI supports verification
          contextWindow: 128000, // Default context window
        }));
      } catch (error) {
        if (error instanceof NearAIError) {
          throw error;
        }
        throw new NearAIError("network_error", undefined, error);
      }
    });
  }

  async verifyResponse(responseId: string): Promise<VerificationResult> {
    this.validateApiKey();

    return this.retryWithBackoff(async () => {
      try {
        // Note: This endpoint may need to be adjusted based on actual NEAR AI API
        const response = await fetch(
          `${this.endpoint}/verify/${responseId}`,
          {
            method: "GET",
            headers: this.getHeaders(),
          }
        );

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        const data = await response.json();

        return {
          verified: data.verified || false,
          attestation: data.attestation,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof NearAIError) {
          throw error;
        }
        throw new NearAIError("verification_failed", undefined, error);
      }
    });
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    switch (status) {
      case 401:
        throw new NearAIError("api_key_invalid", errorData.message);
      case 404:
        throw new NearAIError("model_not_found", errorData.message);
      case 429:
        throw new NearAIError("rate_limit_exceeded", errorData.message);
      case 503:
        throw new NearAIError("endpoint_unavailable", errorData.message);
      default:
        throw new NearAIError(
          "network_error",
          errorData.message || `HTTP ${status}`,
          errorData
        );
    }
  }

  private formatModelName(modelId: string): string {
    // Convert model ID to a more readable name
    return modelId
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

// Export singleton instance
export const nearAI = new NearAI();

// Export class for testing
export { NearAI };
