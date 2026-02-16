import { NextRequest, NextResponse } from 'next/server';
import { NearAIVerification } from '@/lib/near-ai/verification';
import { getNearAICloudApiKey, NEAR_AI_VERIFICATION_CONFIG } from '@/lib/near-ai/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modelName = searchParams.get('model');

    if (!modelName) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }

    const apiKey = getNearAICloudApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'NEAR AI Cloud API key is not configured',
          message: 'Please set NEAR_AI_CLOUD_API_KEY or NEAR_AI_API_KEY environment variable'
        },
        { status: 500 }
      );
    }

    const verification = new NearAIVerification({
      apiKey,
      baseUrl: NEAR_AI_VERIFICATION_CONFIG.apiBaseUrl,
    });

    const attestationReport = await verification.fetchAttestationReport(modelName);

    return NextResponse.json({
      success: true,
      model: modelName,
      attestation: attestationReport,
    });
  } catch (error) {
    console.error('Model verification error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify model',
      },
      { status: 500 }
    );
  }
}
