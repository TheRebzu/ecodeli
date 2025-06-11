import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from 'next-auth';
import type { UserRole } from '@prisma/client';

// Interface pour l'utilisateur avec ses données étendues
interface ExtendedUser {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
  image?: string;
  profileId?: string;
  emailVerified?: Date | null;
  client?: Record<string, unknown> | null;
  deliverer?: Record<string, unknown> | null;
  merchant?: Record<string, unknown> | null;
  provider?: Record<string, unknown> | null;
  admin?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * Interface du store d'authentification
 */
interface AuthState {
  // État
  session: Session | null;
  user: ExtendedUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: ExtendedUser | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;

  // Utilisateur actuel
  getCurrentUser: () => ExtendedUser | null;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

/**
 * Store Zustand pour gérer l'état d'authentification global
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      session: null,
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Définir la session
      setSession: session => {
        set({
          session,
          isAuthenticated: !!session,
          user: (session?.user as ExtendedUser) || null,
          role: (session?.user?.role as UserRole) || null,
        });
      },

      // Définir l'utilisateur
      setUser: user => {
        set({
          user,
          role: (user?.role as UserRole) || null,
        });
      },

      // Définir l'état d'authentification
      setIsAuthenticated: isAuthenticated => {
        set({ isAuthenticated });
      },

      // Définir l'état de chargement
      setIsLoading: isLoading => {
        set({ isLoading });
      },

      // Définir l'erreur
      setError: error => {
        set({ error });
      },

      // Déconnexion
      logout: () => {
        set({
          session: null,
          user: null,
          role: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Récupérer l'utilisateur actuel
      getCurrentUser: () => {
        return get().user;
      },

      // Vérifier si l'utilisateur a un des rôles spécifiés
      hasRole: roles => {
        const userRole = get().role;
        if (!userRole) return false;

        if (Array.isArray(roles)) {
          return roles.includes(userRole);
        }

        return roles === userRole;
      },
    }),
    {
      name: 'ecodeli-auth-storage',
      partialize: state => ({
        // Ne persistez pas les données sensibles comme le mot de passe
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              name: state.user.name,
              role: state.user.role,
              image: state.user.image,
            }
          : null,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
