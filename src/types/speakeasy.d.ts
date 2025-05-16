declare module 'speakeasy' {
  interface GenerateSecretOptions {
    length?: number;
    name?: string;
    issuer?: string;
    symbols?: boolean;
    otpauth_url?: boolean;
    buffer?: boolean;
  }

  interface GenerateSecretResult {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  export function generateSecret(options?: GenerateSecretOptions): GenerateSecretResult;

  export function totp(options: {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    step?: number;
    time?: number;
    counter?: number;
    digits?: number;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
    window?: number;
  }): string;

  export function hotp(options: {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    counter?: number;
    digits?: number;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
  }): string;
}
