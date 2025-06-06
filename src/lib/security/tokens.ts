import { randomBytes } from 'crypto';

export function generateVerificationToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generatePasswordResetToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
