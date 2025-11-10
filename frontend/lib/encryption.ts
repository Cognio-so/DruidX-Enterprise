import * as crypto from 'crypto';

// Encryption key should be stored in environment variable
// If not set, generate a random one (not recommended for production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

function getKeyFromPassword(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
}

/**
 * Encrypts a string value using AES-256-GCM
 * @param text - The plaintext to encrypt
 * @returns Encrypted string (salt + iv + tag + encrypted data) as hex
 */
export function encrypt(text: string): string {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKeyFromPassword(ENCRYPTION_KEY, salt);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine: salt + iv + tag + encrypted
    return salt.toString('hex') + iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string
 * @param encryptedText - The encrypted text (salt + iv + tag + encrypted data) as hex
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
  try {
    const salt = Buffer.from(encryptedText.slice(0, SALT_LENGTH * 2), 'hex');
    const iv = Buffer.from(
      encryptedText.slice(SALT_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2),
      'hex'
    );
    const tag = Buffer.from(
      encryptedText.slice(TAG_POSITION * 2, ENCRYPTED_POSITION * 2),
      'hex'
    );
    const encrypted = encryptedText.slice(ENCRYPTED_POSITION * 2);
    
    const key = getKeyFromPassword(ENCRYPTION_KEY, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

