import { randomBytes } from "crypto";
import { db } from "@/lib/db";

// Token expiration times
const VERIFICATION_TOKEN_EXPIRES_IN = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRES_IN = 1 * 60 * 60 * 1000; // 1 hour

// Generate a random token
function generateToken(length = 32): string {
  return randomBytes(length).toString("hex");
}

// Generate and store a verification token
export async function generateVerificationToken(userId: string): Promise<string> {
  // Delete any existing tokens for this user
  await db.verificationToken.deleteMany({
    where: { userId },
  });

  const token = generateToken();
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_IN);

  await db.verificationToken.create({
    data: {
      token,
      expires,
      userId,
    },
  });

  return token;
}

// Generate and store a password reset token
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // We don't want to reveal if a user exists or not
    return null;
  }

  // Delete any existing reset tokens for this user
  await db.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  const token = generateToken();
  const expires = new Date(Date.now() + RESET_TOKEN_EXPIRES_IN);

  await db.passwordResetToken.create({
    data: {
      token,
      expires,
      userId: user.id,
    },
  });

  return token;
}

// Verify a token is valid for email verification
export async function validateVerificationToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  const verificationToken = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return { valid: false };
  }

  if (new Date() > verificationToken.expires) {
    // Token has expired, delete it
    await db.verificationToken.delete({
      where: { id: verificationToken.id },
    });
    return { valid: false };
  }

  return { valid: true, userId: verificationToken.userId };
}

// Verify a token is valid for password reset
export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return { valid: false };
  }

  if (new Date() > resetToken.expires) {
    // Token has expired, delete it
    await db.passwordResetToken.delete({
      where: { id: resetToken.id },
    });
    return { valid: false };
  }

  return { valid: true, userId: resetToken.userId };
} 