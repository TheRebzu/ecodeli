import { TestUser } from "./users.config";

export interface AuthConfig {
  sessionCookieName: string;
  csrfCookieName: string;
  tokenExpiry: number; // in seconds
  refreshBeforeExpiry: number; // in seconds
}

export const authConfig: AuthConfig = {
  sessionCookieName: "next-auth.session-token",
  csrfCookieName: "next-auth.csrf-token",
  tokenExpiry: 86400, // 24 hours
  refreshBeforeExpiry: 3600, // Refresh 1 hour before expiry
};

export interface AuthSession {
  user: TestUser;
  token: string;
  sessionToken?: string;
  csrfToken?: string;
  expiresAt: Date;
  cookies?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

// Storage for active sessions
export class SessionStorage {
  private static sessions: Map<string, AuthSession> = new Map();

  static store(email: string, session: AuthSession): void {
    this.sessions.set(email, session);
  }

  static get(email: string): AuthSession | undefined {
    return this.sessions.get(email);
  }

  static remove(email: string): void {
    this.sessions.delete(email);
  }

  static clear(): void {
    this.sessions.clear();
  }

  static isExpired(session: AuthSession): boolean {
    return new Date() >= session.expiresAt;
  }

  static needsRefresh(session: AuthSession): boolean {
    const now = new Date();
    const refreshTime = new Date(
      session.expiresAt.getTime() - authConfig.refreshBeforeExpiry * 1000,
    );
    return now >= refreshTime;
  }
}
