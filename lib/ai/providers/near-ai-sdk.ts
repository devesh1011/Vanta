// NEAR AI provider for Vercel AI SDK
// This creates a custom language model provider compatible with AI SDK
// NEAR AI follows the OpenAI API specification

import { createOpenAI } from "@ai-sdk/openai";

const NEAR_AI_ENDPOINT = process.env.NEAR_AI_ENDPOINT || "https://cloud-api.near.ai/v1";
const NEAR_AI_API_KEY = process.env.NEAR_AI_API_KEY;

interface NearAISettings {
  apiKey?: string;
  endpoint?: string;
}

/**
 * Create a NEAR AI provider using OpenAI-compatible API
 * NEAR AI follows the OpenAI API specification, so we can use the OpenAI SDK
 */
export function createNearAI(settings: NearAISettings = {}) {
  const apiKey = settings.apiKey || NEAR_AI_API_KEY;
  const endpoint = settings.endpoint || NEAR_AI_ENDPOINT;

  if (!apiKey) {
    console.warn("NEAR AI API key is not configured");
  }

  // Create a custom fetch wrapper to log requests and responses
  const debugFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    console.log("🔵 NEAR AI Request:", {
      url,
      method: init?.method,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });

    const response = await fetch(input, init);
    
    // Clone the response so we can read it for logging
    const clonedResponse = response.clone();
    
    try {
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("text/event-stream")) {
        console.log("🔵 NEAR AI Response: Streaming (SSE)");
        
        // Create a transform stream to log SSE chunks
        const { readable, writable } = new TransformStream();
        const reader = clonedResponse.body?.getReader();
        const writer = writable.getWriter();
        const decoder = new TextDecoder();
        
        if (reader) {
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  writer.close();
                  break;
                }
                
                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                    try {
                      const jsonStr = line.slice(6);
                      const data = JSON.parse(jsonStr);
                      // Log tool calls with extra detail
                      if (data.choices?.[0]?.delta?.tool_calls) {
                        console.log('🔵 NEAR AI SSE chunk (TOOL CALL):', JSON.stringify(data, null, 2));
                      } else {
                        console.log('🔵 NEAR AI SSE chunk:', JSON.stringify(data, null, 2));
                      }
                    } catch (e) {
                      // Ignore parse errors for incomplete chunks
                    }
                  }
                }
                
                writer.write(value);
              }
            } catch (error) {
              console.error('🔵 NEAR AI Stream error:', error);
              writer.abort(error);
            }
          })();
        }
      } else {
        const data = await clonedResponse.json();
        console.log("🔵 NEAR AI Response:", JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error("🔵 NEAR AI Response parsing error:", error);
    }

    return response;
  };

  // Create an OpenAI-compatible provider pointing to NEAR AI endpoint
  const openai = createOpenAI({
    apiKey: apiKey || "dummy-key",
    baseURL: endpoint,
    fetch: debugFetch,
  });

  // Return a function that creates chat models (not responses models)
  return (modelId: string) => openai.chat(modelId);
}
