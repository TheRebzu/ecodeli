import { authenticator } from "@otplib/preset-default";
import { randomBytes, createHash } from "crypto";

/**
 * Generate a random secret for TOTP
 */
export function generateSecret() {
  return authenticator.generateSecret();
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error("Error verifying TOTP token:", error);
    return false;
  }
}

/**
 * Generate backup codes for MFA
 * @param count Number of backup codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random 6-byte hex string and format it with a hyphen
    const bytes = randomBytes(6).toString("hex");
    const code = `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`;
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash a backup code before storing it in the database
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verify a backup code against a list of hashed backup codes
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): { valid: boolean; index: number } {
  const hashedCode = hashBackupCode(code);
  const index = hashedCodes.findIndex((hash) => hash === hashedCode);
  return { valid: index !== -1, index };
} 