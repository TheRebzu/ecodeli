import { authenticator } from "otplib";
import { randomBytes } from "crypto";

export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret  });
  } catch {
    return false;
  }
}
