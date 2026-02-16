import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.AGENT_KEYSTORE_SECRET || '';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

function validateEncryptionKey(): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('AGENT_KEYSTORE_SECRET environment variable is not set');
  }

  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error('AGENT_KEYSTORE_SECRET must be 64 hex characters (32 bytes)');
  }

  return ENCRYPTION_KEY;
}

/**
 * Encrypts a private key using AES-256-CBC encryption
 * @param privateKey The private key to encrypt
 * @returns Encrypted private key in format "iv:encryptedData"
 */
export function encryptPrivateKey(privateKey: string): string {
  const key = validateEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted private key
 * @param encryptedKey Encrypted private key in format "iv:encryptedData"
 * @returns Decrypted private key
 */
export function decryptPrivateKey(encryptedKey: string): string {
  const key = validateEncryptionKey();
  const parts = encryptedKey.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted key format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    iv
  );
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
