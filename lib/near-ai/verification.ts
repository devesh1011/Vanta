import { sha256 } from '@noble/hashes/sha2.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export interface AttestationReport {
  signing_address: string;
  nvidia_payload: string;
  intel_quote: string;
  all_attestations: Array<{
    signing_address: string;
    nvidia_payload: string;
    intel_quote: string;
  }>;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  signingAddress?: string;
  timestamp?: string;
  error?: string;
  details?: {
    algorithm: string;
    hashMethod: string;
  };
}

export interface NearAIConfig {
  apiKey: string;
  baseUrl: string;
}

export class NearAIVerification {
  private config: NearAIConfig;

  constructor(config: NearAIConfig) {
    this.config = config;
  }

  /**
   * Fetch attestation report for a NEAR AI model
   */
  async fetchAttestationReport(modelName: string): Promise<AttestationReport> {
    if (!this.config.apiKey) {
      throw new Error('NEAR AI Cloud API key is not configured');
    }

    const url = `${this.config.baseUrl}/attestation/report?model=${encodeURIComponent(modelName)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch attestation report: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data as AttestationReport;
  }

  /**
   * Compute message hash according to NEAR AI specifications
   */
  computeMessageHash(message: string): string {
    const messageBytes = new TextEncoder().encode(message);
    const hash = sha256(messageBytes);
    return bytesToHex(hash);
  }

  /**
   * Verify message signature using Ed25519
   */
  async verifyMessageSignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // Compute message hash
      const messageHash = this.computeMessageHash(message);
      const messageHashBytes = hexToBytes(messageHash);

      // Convert signature and public key from hex
      const signatureBytes = hexToBytes(signature);
      const publicKeyBytes = hexToBytes(publicKey);

      // Verify signature
      const isValid = ed25519.verify(signatureBytes, messageHashBytes, publicKeyBytes);
      return isValid;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify a chat message with full details
   */
  async verifyChatMessage(
    messageContent: string,
    signature?: string,
    signingAddress?: string
  ): Promise<VerificationResult> {
    if (!signature || !signingAddress) {
      return {
        success: false,
        verified: false,
        error: 'Message signature or signing address not available',
      };
    }

    try {
      const isValid = await this.verifyMessageSignature(
        messageContent,
        signature,
        signingAddress
      );

      return {
        success: true,
        verified: isValid,
        signingAddress,
        timestamp: new Date().toISOString(),
        details: {
          algorithm: 'Ed25519',
          hashMethod: 'SHA-256',
        },
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
