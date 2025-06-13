import axios, { AxiosError } from 'axios';
import { getAuthUrl } from '../config/api.config';
import { 
  AuthSession, 
  LoginCredentials, 
  LoginResponse, 
  SessionStorage,
  authConfig 
} from '../config/auth.config';
import { TestUser } from '../config/users.config';
import { authLogger } from './logger.helper';

export class AuthHelper {
  /**
   * Login with credentials and get session
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      authLogger.info(`Attempting login for: ${credentials.email}`);
      
      // Get CSRF token first
      const csrfResponse = await axios.get(getAuthUrl('csrf'), {
        withCredentials: true
      });
      
      const csrfToken = csrfResponse.data.csrfToken;
      const cookies = csrfResponse.headers['set-cookie'] || [];
      
      authLogger.debug('CSRF token obtained', { csrfToken });

      // Perform login
      const loginResponse = await axios.post(
        getAuthUrl('callback/credentials'),
        {
          email: credentials.email,
          password: credentials.password,
          csrfToken
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies.join('; ')
          },
          withCredentials: true,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );

      // Get session
      const sessionResponse = await axios.get(getAuthUrl('session'), {
        headers: {
          'Cookie': loginResponse.headers['set-cookie']?.join('; ') || cookies.join('; ')
        },
        withCredentials: true
      });

      if (sessionResponse.data && sessionResponse.data.user) {
        const session: AuthSession = {
          user: {
            email: sessionResponse.data.user.email,
            password: credentials.password,
            role: sessionResponse.data.user.role,
            name: sessionResponse.data.user.name || 'Test User',
            description: ''
          } as TestUser,
          token: sessionResponse.data.accessToken || '',
          sessionToken: this.extractSessionToken(loginResponse.headers['set-cookie']),
          csrfToken,
          expiresAt: new Date(Date.now() + authConfig.tokenExpiry * 1000),
          cookies: loginResponse.headers['set-cookie']
        };

        // Store session
        SessionStorage.store(credentials.email, session);
        
        authLogger.success(`Login successful for: ${credentials.email}`);
        return { success: true, session };
      }

      authLogger.error('Login failed: No session data');
      return { success: false, error: 'No session data received' };

    } catch (error) {
      const axiosError = error as AxiosError;
      authLogger.error(`Login failed for: ${credentials.email}`, axiosError.response?.data);
      
      return {
        success: false,
        error: axiosError.response?.data?.error || axiosError.message || 'Login failed'
      };
    }
  }

  /**
   * Logout and clear session
   */
  static async logout(email: string): Promise<void> {
    try {
      const session = SessionStorage.get(email);
      if (!session) {
        authLogger.warning(`No session found for: ${email}`);
        return;
      }

      await axios.post(
        getAuthUrl('signout'),
        { csrfToken: session.csrfToken },
        {
          headers: {
            'Cookie': session.cookies?.join('; ') || ''
          },
          withCredentials: true
        }
      );

      SessionStorage.remove(email);
      authLogger.success(`Logout successful for: ${email}`);
      
    } catch (error) {
      authLogger.error(`Logout failed for: ${email}`, error);
      // Still remove from storage even if logout fails
      SessionStorage.remove(email);
    }
  }

  /**
   * Get current session or login if needed
   */
  static async getSession(user: TestUser): Promise<AuthSession | null> {
    // Check stored session
    let session = SessionStorage.get(user.email);

    // If no session or expired, login
    if (!session || SessionStorage.isExpired(session)) {
      authLogger.info(`Session expired or not found for: ${user.email}, logging in...`);
      const loginResult = await this.login({
        email: user.email,
        password: user.password
      });

      if (!loginResult.success || !loginResult.session) {
        authLogger.error(`Failed to get session for: ${user.email}`);
        return null;
      }

      session = loginResult.session;
    }

    // Check if needs refresh
    if (SessionStorage.needsRefresh(session)) {
      authLogger.info(`Refreshing session for: ${user.email}`);
      await this.refreshSession(session);
    }

    return session;
  }

  /**
   * Refresh session token
   */
  static async refreshSession(session: AuthSession): Promise<AuthSession | null> {
    try {
      const response = await axios.get(getAuthUrl('session'), {
        headers: {
          'Cookie': session.cookies?.join('; ') || ''
        },
        withCredentials: true
      });

      if (response.data && response.data.user) {
        const refreshedSession: AuthSession = {
          ...session,
          token: response.data.accessToken || session.token,
          expiresAt: new Date(Date.now() + authConfig.tokenExpiry * 1000),
          cookies: response.headers['set-cookie'] || session.cookies
        };

        SessionStorage.store(session.user.email, refreshedSession);
        authLogger.success(`Session refreshed for: ${session.user.email}`);
        return refreshedSession;
      }

      return null;
    } catch (error) {
      authLogger.error(`Failed to refresh session for: ${session.user.email}`, error);
      return null;
    }
  }

  /**
   * Extract session token from cookies
   */
  private static extractSessionToken(cookies?: string[]): string | undefined {
    if (!cookies) return undefined;

    for (const cookie of cookies) {
      if (cookie.includes(authConfig.sessionCookieName)) {
        const match = cookie.match(/=(.*?);/);
        return match ? match[1] : undefined;
      }
    }

    return undefined;
  }

  /**
   * Get authorization headers for a session
   */
  static getAuthHeaders(session: AuthSession): Record<string, string> {
    return {
      'Authorization': `Bearer ${session.token}`,
      'Cookie': session.cookies?.join('; ') || '',
      'X-CSRF-Token': session.csrfToken || ''
    };
  }

  /**
   * Clear all sessions
   */
  static clearAllSessions(): void {
    SessionStorage.clear();
    authLogger.info('All sessions cleared');
  }
}