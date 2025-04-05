import { signIn, signOut } from "next-auth/react";
import { UserRole } from "@/lib/validations/auth";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Record<string, unknown>;
}

export const AuthService = {
  /**
   * Login user with credentials
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        return {
          success: false,
          message: "Identifiants invalides",
        };
      }

      return {
        success: true,
        message: "Connexion réussie",
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la connexion",
      };
    }
  },

  /**
   * Register a new user
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Une erreur est survenue lors de l'inscription",
        };
      }

      return {
        success: true,
        message: "Compte créé avec succès",
        user: data.user,
      };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de l'inscription",
      };
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<AuthResponse> => {
    try {
      await signOut({ redirect: false });
      
      return {
        success: true,
        message: "Déconnexion réussie",
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la déconnexion",
      };
    }
  },

  /**
   * Get current user data
   */
  getCurrentUser: async () => {
    try {
      const response = await fetch("/api/auth/session");
      const session = await response.json();

      if (!session || !session.user) {
        return null;
      }

      return session.user;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<AuthResponse> => {
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Une erreur est survenue",
        };
      }

      return {
        success: true,
        message: "Instructions de réinitialisation envoyées par email",
      };
    } catch (error) {
      console.error("Password reset request error:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de l'envoi des instructions",
      };
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordData): Promise<AuthResponse> => {
    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || "Une erreur est survenue",
        };
      }

      return {
        success: true,
        message: "Mot de passe réinitialisé avec succès",
      };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la réinitialisation du mot de passe",
      };
    }
  },
}; 