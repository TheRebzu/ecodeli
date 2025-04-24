"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { useTranslations } from "next-intl";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * Composant de garde pour protéger les routes en fonction de l'authentification et des rôles
 * 
 * @param children Contenu à afficher si l'utilisateur est autorisé
 * @param allowedRoles Tableau des rôles autorisés à accéder au contenu (optionnel)
 * @param requireAuth Si true, l'utilisateur doit être authentifié (par défaut: true)
 * @param redirectTo Chemin de redirection si l'utilisateur n'est pas autorisé (par défaut: /login)
 */
export function AuthGuard({ 
  children, 
  allowedRoles,
  requireAuth = true,
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const t = useTranslations();
  
  // Si l'authentification est requise et que l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (requireAuth && status === "unauthenticated") {
    redirect(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`);
  }
  
  // Si l'authentification n'est pas requise et que l'utilisateur est connecté, continuer
  if (!requireAuth) {
    return <>{children}</>;
  }
  
  // Si la session est en cours de chargement, afficher un indicateur de chargement
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Si des rôles spécifiques sont requis, vérifier si l'utilisateur a un rôle autorisé
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = session?.user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
      // Rediriger vers le tableau de bord approprié en fonction du rôle de l'utilisateur
      const dashboardPaths: Record<UserRole, string> = {
        CLIENT: "/client/dashboard",
        DELIVERER: "/deliverer/dashboard",
        MERCHANT: "/merchant/dashboard",
        PROVIDER: "/provider/dashboard",
        ADMIN: "/admin/dashboard",
      };
      
      redirect(userRole ? dashboardPaths[userRole as UserRole] : redirectTo);
    }
  }
  
  // L'utilisateur est authentifié et a les rôles requis, afficher le contenu
  return <>{children}</>;
}
