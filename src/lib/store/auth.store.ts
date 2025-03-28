import { create } from "zustand";
import { AuthService, LoginCredentials, RegisterCredentials } from "@/lib/services/auth.service";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => Promise<boolean>;
  refreshUser: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const result = await AuthService.login(credentials);
          
          if (result.success) {
            // Here we would normally get the user from the session
            // For now, we'll set a dummy user
            const user = await AuthService.getCurrentUser();
            set({ 
              isAuthenticated: true, 
              user, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              isAuthenticated: false, 
              user: null, 
              error: result.message || "Une erreur est survenue lors de la connexion", 
              isLoading: false 
            });
            return false;
          }
        } catch (error) {
          set({ 
            isAuthenticated: false, 
            user: null, 
            error: "Une erreur est survenue lors de la connexion", 
            isLoading: false 
          });
          return false;
        }
      },
      
      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const result = await AuthService.register(credentials);
          
          if (result.success) {
            // On successful registration, we don't log in automatically
            set({ isLoading: false });
            return true;
          } else {
            set({ 
              error: result.message || "Une erreur est survenue lors de l'inscription", 
              isLoading: false 
            });
            return false;
          }
        } catch (error) {
          set({ 
            error: "Une erreur est survenue lors de l'inscription", 
            isLoading: false 
          });
          return false;
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        try {
          const result = await AuthService.logout();
          
          if (result.success) {
            set({ 
              isAuthenticated: false, 
              user: null, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              error: result.message || "Une erreur est survenue lors de la déconnexion", 
              isLoading: false 
            });
            return false;
          }
        } catch (error) {
          set({ 
            error: "Une erreur est survenue lors de la déconnexion", 
            isLoading: false 
          });
          return false;
        }
      },
      
      refreshUser: async () => {
        set({ isLoading: true });
        try {
          const user = await AuthService.getCurrentUser();
          
          if (user) {
            set({ 
              isAuthenticated: true, 
              user, 
              isLoading: false 
            });
            return true;
          } else {
            set({ 
              isAuthenticated: false, 
              user: null, 
              isLoading: false 
            });
            return false;
          }
        } catch (error) {
          set({ 
            isAuthenticated: false, 
            user: null, 
            isLoading: false 
          });
          return false;
        }
      },
      
      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
      
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
    }),
    {
      name: "ecodeli-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
); 