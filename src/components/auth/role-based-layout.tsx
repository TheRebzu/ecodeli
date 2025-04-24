"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { useTranslations } from "next-intl";

interface RoleBasedLayoutProps {
  children: ReactNode;
  role: UserRole;
}

/**
 * Composant de mise en page basé sur le rôle de l'utilisateur
 * Redirige l'utilisateur vers la page appropriée en fonction de son rôle
 * 
 * @param children Contenu à afficher si l'utilisateur a le rôle requis
 * @param role Rôle requis pour accéder au contenu
 */
export function RoleBasedLayout({ children, role }: RoleBasedLayoutProps) {
  const { data: session, status } = useSession();
  const t = useTranslations();
  
  // Si la session est en cours de chargement, afficher un indicateur de chargement
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (status === "unauthenticated") {
    redirect(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
  }
  
  // Vérifier si l'utilisateur a le rôle requis
  const userRole = session?.user?.role;
  
  if (userRole !== role) {
    // Rediriger vers le tableau de bord approprié en fonction du rôle de l'utilisateur
    const dashboardPaths: Record<UserRole, string> = {
      CLIENT: "/client/dashboard",
      DELIVERER: "/deliverer/dashboard",
      MERCHANT: "/merchant/dashboard",
      PROVIDER: "/provider/dashboard",
      ADMIN: "/admin/dashboard",
    };
    
    redirect(userRole ? dashboardPaths[userRole as UserRole] : "/login");
  }
  
  // L'utilisateur a le rôle requis, afficher le contenu
  return <>{children}</>;
}
