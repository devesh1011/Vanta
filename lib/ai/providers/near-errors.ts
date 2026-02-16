// NEAR AI specific error handling

export type NearAIErrorCode =
  | "api_key_missing"
  | "api_key_invalid"
  | "endpoint_unavailable"
  | "model_not_found"
  | "rate_limit_exceeded"
  | "verification_failed"
  | "tee_unavailable"
  | "invalid_request"
  | "network_error";

export const nearAIErrorMessages: Record<NearAIErrorCode, string> = {
  api_key_missing: "NEAR AI API key is not configured. Please add NEAR_AI_API_KEY to your environment variables.",
  api_key_invalid: "NEAR AI API key is invalid. Please check your API key and try again.",
  endpoint_unavailable: "NEAR AI service is currently unavailable. Please try again later.",
  model_not_found: "The selected model is not available. Please choose a different model.",
  rate_limit_exceeded: "Rate limit exceeded. Please try again later.",
  verification_failed: "Response verification failed. The response may not be trustworthy.",
  tee_unavailable: "TEE environment is not available for private inference.",
  invalid_request: "Invalid request parameters. Please check your input and try again.",
  network_error: "Network error occurred while connecting to NEAR AI. Please check your connection.",
};

export class NearAIError extends Error {
  constructor(
    public code: NearAIErrorCode,
    message?: string,
    public details?: any
  ) {
    super(message || nearAIErrorMessages[code]);
    this.name = "NearAIError";
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
