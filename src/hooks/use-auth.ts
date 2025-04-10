'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { 
  UserRole, 
  Permission,
  ActionType,
  AppSystem,
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  getAllowedActions,
  getAccessibleSystems
} from '@/lib/auth-utils';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Types nécessaires pour l'inscription
export type RegisterCredentialsType = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  acceptTerms: boolean;
  [key: string]: any; // Pour les champs spécifiques aux différents rôles
};

/**
 * Hook personnalisé pour gérer l'authentification et les vérifications d'accès.
 * Utilise useSession de next-auth et fournit des méthodes pour vérifier le rôle et le statut.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(status === 'loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastLoginAttempt, setLastLoginAttempt] = useState<number>(0);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  
  // Rediriger vers la page de connexion
  const redirectToLogin = useCallback((callbackUrl?: string) => {
    router.push(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
  }, [router]);
  
  // Rediriger vers le dashboard approprié selon le rôle
  const redirectToDashboard = useCallback(() => {
    if (!session?.user?.role) {
      router.push('/');
      return;
    }
    
    const role = session.user.role as UserRole;
    
    switch (role) {
      case UserRole.ADMIN:
        router.push('/admin/dashboard');
        break;
      case UserRole.CLIENT:
        router.push('/client/dashboard');
        break;
      case UserRole.COURIER:
        router.push('/courier/dashboard');
        break;
      case UserRole.MERCHANT:
        router.push('/merchant/dashboard');
        break;
      case UserRole.PROVIDER:
        router.push('/provider/dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  }, [router, session]);
  
  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!session?.user?.role) return false;
    return checkPermission(session.user.role as string, permission);
  }, [session]);
  
  // Vérifier si l'utilisateur a au moins une des permissions
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!session?.user?.role) return false;
    return checkAnyPermission(session.user.role as string, permissions);
  }, [session]);
  
  // Vérifier si l'utilisateur a toutes les permissions
  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    if (!session?.user?.role) return false;
    return checkAllPermissions(session.user.role as string, permissions);
  }, [session]);
  
  // Obtenir les actions autorisées sur un système
  const getAllowedActionTypes = useCallback((system: AppSystem): ActionType[] => {
    if (!session?.user?.role) return [];
    return getAllowedActions(session.user.role as UserRole, system);
  }, [session]);
  
  // Obtenir les systèmes accessibles
  const getAccessibleAppSystems = useCallback((): AppSystem[] => {
    if (!session?.user?.role) return [];
    return getAccessibleSystems(session.user.role as UserRole);
  }, [session]);
  
  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!session?.user?.role) return false;
    
    const userRole = session.user.role as UserRole;
    
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    
    return userRole === role;
  }, [session]);
  
  // Obtenir le chemin du dashboard en fonction du rôle
  const getDashboardPath = useCallback((): string => {
    if (!session?.user?.role) return '/';
    
    const role = session.user.role as UserRole;
    
    switch (role) {
      case UserRole.ADMIN:
        return '/admin/dashboard';
      case UserRole.CLIENT:
        return '/client/dashboard';
      case UserRole.COURIER:
        return '/courier/dashboard';
      case UserRole.MERCHANT:
        return '/merchant/dashboard';
      case UserRole.PROVIDER:
        return '/provider/dashboard';
      default:
        return '/dashboard';
    }
  }, [session]);
  
  // Se connecter et rediriger
  const login = async (data: { email: string; password: string; rememberMe?: boolean }, callbackUrl?: string) => {
    // Vérifier le nombre de tentatives de connexion
    const now = Date.now();
    if (now - lastLoginAttempt < 3000 && loginAttempts >= 10) {
      return { success: false, error: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.' };
    }
    
    // Simplifier la détection de boucle de redirection
    if (typeof window !== 'undefined') {
      // Nettoyer le compteur précédent si existant
      window.sessionStorage.removeItem('loginAttemptCount');
    }
    
    setLoading(true);
    setLastLoginAttempt(now);
    setLoginAttempts(prev => prev + 1);
    
    try {
      // Déterminer la redirection: si pas de callbackUrl spécifique, utiliser le dashboard
      const targetCallbackUrl = callbackUrl || "/dashboard";
      
      console.log(`[auth] Tentative de connexion avec redirection vers: ${targetCallbackUrl}`);
      
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
        callbackUrl: targetCallbackUrl
      });
      
      if (result?.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      // Réinitialiser le compteur de tentatives de connexion
      setLoginAttempts(0);
      
      // Log pour débogage
      console.log(`[auth] Login successful, redirect URL: ${result?.url || targetCallbackUrl}`);
      
      // Simplification de la redirection
      let redirectUrl = result?.url || targetCallbackUrl;
      
      console.log(`[auth] Redirection finale vers: ${redirectUrl}`);
      
      // Utiliser timeout pour laisser le temps à la session d'être établie
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = redirectUrl;
        }
      }, 800); // Augmenter le délai pour s'assurer que la session est bien établie
      
      return { success: true };
    } catch (error) {
      console.error("[auth] Error during login:", error);
      setLoading(false);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };
  
  // S'inscrire (fonction générique pour tous les types d'utilisateurs)
  const register = async (data: RegisterCredentialsType): Promise<{ success: boolean; error?: string }> => {
    if (!data.acceptTerms) {
      return { success: false, error: 'Vous devez accepter les conditions générales' };
    }
    
    setLoading(true);
    try {
      // Construire le chemin de l'API en fonction du rôle de l'utilisateur
      const apiPath = `/api/auth/register/${data.role.toLowerCase()}`;
      
      // Appel API pour l'inscription
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setLoading(false);
        return { success: false, error: result.message || `Échec de l'inscription en tant que ${data.role}` };
      }
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      setLoading(false);
      return { success: false, error: 'Une erreur est survenue lors de l\'inscription' };
    }
  };
  
  // Inscription en tant que client
  const registerClient = async (data: RegisterCredentialsType): Promise<{ success: boolean; error?: string }> => {
    return register({
      ...data,
      role: UserRole.CLIENT
    });
  };
  
  // Inscription en tant que livreur
  const registerCourier = async (data: RegisterCredentialsType): Promise<{ success: boolean; error?: string }> => {
    return register({
      ...data,
      role: UserRole.COURIER
    });
  };
  
  // Inscription en tant que commerçant
  const registerMerchant = async (data: RegisterCredentialsType): Promise<{ success: boolean; error?: string }> => {
    return register({
      ...data,
      role: UserRole.MERCHANT
    });
  };
  
  // Inscription en tant que prestataire
  const registerProvider = async (data: RegisterCredentialsType): Promise<{ success: boolean; error?: string }> => {
    return register({
      ...data,
      role: UserRole.PROVIDER
    });
  };
  
  // Se déconnecter et rediriger vers la page d'accueil
  const logout = async (callbackUrl?: string) => {
    setLoading(true);
    try {
      await signOut({ redirect: false });
      
      // Rafraîchir l'état du hook et rediriger vers la page de connexion
      setAuthError(null);
      router.push(callbackUrl || '/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Social Login with Google
  const signInWithGoogle = async (callbackUrl?: string) => {
    if (typeof window === 'undefined') {
      console.error('Cette fonction doit être appelée côté client uniquement');
      return false;
    }
    
    try {
      signIn('google', { callbackUrl, redirect: true });
      return true;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return false;
    }
  };

  // Social Login with Facebook
  const signInWithFacebook = async (callbackUrl?: string) => {
    if (typeof window === 'undefined') {
      console.error('Cette fonction doit être appelée côté client uniquement');
      return false;
    }
    
    try {
      signIn('facebook', { callbackUrl, redirect: true });
      return true;
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
      return false;
    }
  };
  
  // Update user profile
  const updateProfile = async (data: { 
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  }) => {
    if (!session?.user?.id) {
      return { success: false, error: 'Utilisateur non connecté' };
    }
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.message || 'Échec de la mise à jour du profil' };
      }
      
      return { success: true, data: result.user };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };
  
  // Change password
  const changePassword = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    if (!session?.user?.id) {
      return { success: false, error: 'Utilisateur non connecté' };
    }
    
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.message || 'Échec du changement de mot de passe' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };
  
  useEffect(() => {
    setLoading(status === 'loading');
  }, [status]);
  
  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: loading,
    status: status as AuthStatus,
    redirectToLogin,
    redirectToDashboard,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getAllowedActionTypes,
    getAccessibleAppSystems,
    hasRole,
    getDashboardPath,
    login,
    register,
    registerClient,
    registerCourier,
    registerMerchant,
    registerProvider,
    logout,
    signIn: login,
    signInWithGoogle,
    signInWithFacebook,
    updateProfile,
    changePassword
  };
}

// Constantes pour les permissions communes
export const CommonPermissions = {
  // Client permissions
  CLIENT_ORDER_VIEW: `${ActionType.VIEW}_${AppSystem.ORDERS}` as Permission,
  CLIENT_ORDER_CREATE: `${ActionType.CREATE}_${AppSystem.ORDERS}` as Permission,
  
  // Courier permissions
  COURIER_DELIVERY_VIEW: `${ActionType.VIEW}_${AppSystem.DELIVERIES}` as Permission,
  COURIER_DELIVERY_UPDATE: `${ActionType.EDIT}_${AppSystem.DELIVERIES}` as Permission,
  
  // Merchant permissions
  MERCHANT_PRODUCT_MANAGE: `${ActionType.MANAGE}_${AppSystem.PRODUCTS}` as Permission,
  MERCHANT_ANALYTICS_VIEW: `${ActionType.VIEW}_${AppSystem.ANALYTICS}` as Permission,
  
  // Provider permissions
  PROVIDER_SERVICE_MANAGE: `${ActionType.MANAGE}_${AppSystem.SERVICES}` as Permission,
  
  // Admin permissions
  ADMIN_ALL: `${ActionType.MANAGE}_${AppSystem.ADMIN}` as Permission,
  ADMIN_USERS: `${ActionType.MANAGE}_${AppSystem.USERS}` as Permission,
  
  // Common permissions
  PROFILE_VIEW: `${ActionType.VIEW}_${AppSystem.PROFILE}` as Permission,
  PROFILE_EDIT: `${ActionType.EDIT}_${AppSystem.PROFILE}` as Permission,
};

export { UserRole, ActionType, AppSystem };
export type { Permission };
export default useAuth; 