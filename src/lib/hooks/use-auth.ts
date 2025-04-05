'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
<<<<<<< Updated upstream
import { useEffect, useState } from 'react';
import { UserRole } from '@/middleware';
=======
import { useCallback, useEffect, useState } from 'react';
import { UserRole } from '@/lib/validations/auth';
>>>>>>> Stashed changes

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Type pour les rôles utilisateurs
export type RoleBasedPermission = {
  roles: UserRole[];
  allowed: boolean;
};

// Types de fonctionnalités du système
export type SystemFeature = 
  | 'create_shipment'
  | 'manage_users'
  | 'access_admin'
  | 'manage_products'
  | 'view_analytics'
  | 'manage_payments'
  | 'manage_storage'
  | 'create_service'
  | 'offer_service';

// Permissions par défaut basées sur les rôles
const defaultPermissions: Record<SystemFeature, RoleBasedPermission[]> = {
  create_shipment: [
    { roles: ['ADMIN', 'CLIENT', 'MERCHANT'], allowed: true },
    { roles: ['COURIER', 'PROVIDER'], allowed: false }
  ],
  manage_users: [
    { roles: ['ADMIN'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'MERCHANT', 'PROVIDER'], allowed: false }
  ],
  access_admin: [
    { roles: ['ADMIN'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'MERCHANT', 'PROVIDER'], allowed: false }
  ],
  manage_products: [
    { roles: ['ADMIN', 'MERCHANT'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'PROVIDER'], allowed: false }
  ],
  view_analytics: [
    { roles: ['ADMIN'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'MERCHANT', 'PROVIDER'], allowed: false }
  ],
  manage_payments: [
    { roles: ['ADMIN'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'MERCHANT', 'PROVIDER'], allowed: false }
  ],
  manage_storage: [
    { roles: ['ADMIN', 'PROVIDER'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'MERCHANT'], allowed: false }
  ],
  create_service: [
    { roles: ['ADMIN', 'PROVIDER'], allowed: true },
    { roles: ['CLIENT', 'COURIER', 'MERCHANT'], allowed: false }
  ],
  offer_service: [
    { roles: ['ADMIN', 'PROVIDER', 'COURIER'], allowed: true },
    { roles: ['CLIENT', 'MERCHANT'], allowed: false }
  ]
};

/**
 * Hook personnalisé pour gérer l'authentification et les vérifications d'accès.
 * Utilise useSession de next-auth et fournit des méthodes pour vérifier le rôle et le statut.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(status === 'loading');
  
  // Rediriger vers la page de connexion
<<<<<<< Updated upstream
  const redirectToLogin = (callbackUrl?: string) => {
    router.push(callbackUrl ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/login');
  };
=======
  const redirectToLogin = useCallback((callbackUrl?: string) => {
    router.push(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
  }, [router]);
>>>>>>> Stashed changes
  
  // Rediriger vers le dashboard approprié selon le rôle
  const redirectToDashboard = () => {
    if (!session?.user?.role) {
      router.push('/');
      return;
    }
    
    const dashboardUrls: Record<string, string> = {
      ADMIN: '/dashboard',
      CLIENT: '/dashboard/client',
      COURIER: '/dashboard/courier',
      MERCHANT: '/dashboard/merchant',
      PROVIDER: '/dashboard/provider'
    };
    
    const dashboardUrl = dashboardUrls[session.user.role as string] || '/';
    router.push(dashboardUrl);
  };
  
  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (feature: SystemFeature): boolean => {
    if (!session?.user?.role) return false;
    
    const userRole = session.user.role as UserRole;
    const permissions = defaultPermissions[feature];
    
    if (!permissions) return false;
    
    // Trouver la permission qui correspond au rôle
    const permissionEntry = permissions.find(p => p.roles.includes(userRole));
    return permissionEntry?.allowed || false;
  };
  
  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!session?.user?.role) return false;
    
    const userRole = session.user.role as UserRole;
    
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    
    return userRole === role;
  };
  
  // Se connecter et rediriger
  const login = async (data: { email: string; password: string }, callbackUrl?: string) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password
      });
      
      if (result?.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        setTimeout(() => {
          redirectToDashboard();
        }, 300);
      }
      
      return { success: true };
    } catch {
      setLoading(false);
      return { success: false, error: 'Une erreur est survenue' };
    }
  };
  
  // S'inscrire et se connecter automatiquement
  const register = async (data: { 
    name: string; 
    email: string; 
    password: string; 
    role: UserRole;
  }) => {
    setLoading(true);
    try {
      // Appel API pour l'inscription
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setLoading(false);
        return { success: false, error: result.message || 'Échec de l\'inscription' };
      }
      
      // Connexion automatique après inscription réussie
      const loginResult = await login({ 
        email: data.email, 
        password: data.password 
      });
      
      return loginResult;
    } catch {
      setLoading(false);
      return { success: false, error: 'Une erreur est survenue lors de l\'inscription' };
    }
  };
  
  // Se déconnecter et rediriger vers la page d'accueil
  const logout = async (callbackUrl?: string) => {
    setLoading(true);
    try {
      await signOut({ redirect: false });
<<<<<<< Updated upstream
      router.push('/');
      return { success: true };
    } catch {
      setLoading(false);
      return { success: false, error: 'Une erreur est survenue' };
=======
      
      // Rafraîchir l'état du hook et rediriger vers la page de connexion
      setAuthError(null);
      router.push(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setLoading(false);
>>>>>>> Stashed changes
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
    hasRole,
    login,
    register,
    logout
  };
}

export default useAuth; 