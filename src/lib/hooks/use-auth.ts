'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { Role, Status } from '@prisma/client';

interface UseAuthOptions {
  requiredRole?: Role | Role[];
  requiredStatus?: Status | Status[];
  redirectTo?: string;
  redirectIfFound?: boolean;
}

/**
 * Hook personnalisé pour gérer l'authentification et les vérifications d'accès.
 * Utilise useSession de next-auth et fournit des méthodes pour vérifier le rôle et le statut.
 */
export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const { 
    requiredRole, 
    requiredStatus,
    redirectTo = '/login', 
    redirectIfFound = false 
  } = options;
  
  const isAuthenticated = authStatus === 'authenticated';
  const isLoading = authStatus === 'loading';
  const user = session?.user;
  
  // Fonction de vérification de rôle
  const hasRequiredRole = useCallback(() => {
    if (!requiredRole || !user) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role as Role);
    }
    
    return user.role === requiredRole;
  }, [requiredRole, user]);
  
  // Fonction de vérification de statut
  const hasRequiredStatus = useCallback(() => {
    if (!requiredStatus || !user) return false;
    
    if (Array.isArray(requiredStatus)) {
      return requiredStatus.includes(user.status as Status);
    }
    
    return user.status === requiredStatus;
  }, [requiredStatus, user]);
  
  // Vérification des autorisations d'accès
  const checkAccess = useCallback(() => {
    if (isLoading) return null;
    
    if (redirectIfFound && isAuthenticated) {
      // Rediriger si l'utilisateur est authentifié et qu'on ne veut pas qu'il accède à cette page
      return router.push(redirectTo);
    }
    
    if (!redirectIfFound && !isAuthenticated) {
      // Rediriger si l'utilisateur n'est pas authentifié et que l'authentification est requise
      return router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`);
    }
    
    // Si un rôle spécifique est requis et que l'utilisateur n'a pas ce rôle
    if (requiredRole && isAuthenticated && !hasRequiredRole()) {
      return router.push('/unauthorized');
    }
    
    // Si un statut spécifique est requis et que l'utilisateur n'a pas ce statut
    if (requiredStatus && isAuthenticated && !hasRequiredStatus()) {
      return router.push('/unauthorized');
    }
    
    return null;
  }, [
    isLoading, 
    isAuthenticated, 
    redirectIfFound, 
    redirectTo, 
    router, 
    requiredRole, 
    requiredStatus, 
    hasRequiredRole, 
    hasRequiredStatus
  ]);
  
  // Effectuer la vérification d'accès au chargement du composant
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);
  
  return {
    user,
    isAuthenticated,
    isLoading,
    role: user?.role as Role | undefined,
    status: user?.status as Status | undefined,
    hasRequiredRole,
    hasRequiredStatus,
    checkAccess,
  };
}

export default useAuth; 