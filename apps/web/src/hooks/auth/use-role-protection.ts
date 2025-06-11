import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { useAuth } from '@/hooks/auth/use-auth';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook pour protéger les routes basées sur les rôles d'utilisateur
 * @param allowedRoles Tableau des rôles autorisés à accéder à la route
 * @param redirectTo Chemin de redirection en cas d'accès non autorisé (par défaut: / ou dashboard approprié)
 */
export function useRoleProtection(allowedRoles: UserRole[] = [], redirectTo?: string) {
  const { user, role, status, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    // Ne rien faire pendant le chargement
    if (isLoading || status === 'loading') return;

    // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // Si des rôles sont spécifiés mais que l'utilisateur n'a pas le bon rôle
    if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
      // Afficher une notification
      toast({
        title: 'Accès refusé',
        description: "Vous n'avez pas les autorisations nécessaires pour accéder à cette page.",
        variant: 'destructive',
      });

      // Rediriger vers la page spécifiée ou le dashboard approprié
      if (redirectTo) {
        router.push(redirectTo);
      } else if (role) {
        const dashboardPath = getDashboardByRole(role);
        router.push(dashboardPath);
      } else {
        router.push('/');
      }
    }
  }, [role, isLoading, status, allowedRoles, router, pathname, redirectTo, toast]);

  // Retourner les informations utiles au composant
  return {
    role,
    isLoading,
    isAuthorized: !role || allowedRoles.length === 0 || allowedRoles.includes(role),
    user,
  };
}

/**
 * Récupère le chemin du dashboard en fonction du rôle
 */
function getDashboardByRole(role: UserRole): string {
  switch (role) {
    case 'CLIENT':
      return '/client';
    case 'DELIVERER':
      return '/deliverer';
    case 'MERCHANT':
      return '/merchant';
    case 'PROVIDER':
      return '/provider';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}
