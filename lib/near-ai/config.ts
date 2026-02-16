export const NEAR_AI_VERIFICATION_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_NEAR_VERIFICATION !== 'false',
  apiBaseUrl: process.env.NEAR_AI_ENDPOINT || 'https://cloud-api.near.ai/v1',
  cloudApiKey: process.env.NEAR_AI_CLOUD_API_KEY || process.env.NEAR_AI_API_KEY,
  cacheAttestationTTL: 3600, // 1 hour in seconds
  enableMessageVerification: true,
  enableModelVerification: true,
};

export function isNearModel(modelName: string): boolean {
  return modelName.toLowerCase().startsWith('near');
}

export function getNearAICloudApiKey(): string | undefined {
  return process.env.NEAR_AI_CLOUD_API_KEY || process.env.NEAR_AI_API_KEY;
}
