"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

/**
 * Composant de garde pour protéger les routes en fonction du rôle de l'utilisateur
 *
 * @param children Contenu à afficher si l'utilisateur a le rôle requis
 * @param allowedRoles Tableau des rôles autorisés à accéder au contenu
 * @param redirectTo Chemin de redirection si l'utilisateur n'a pas le rôle requis (par défaut: /login)
 */
export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = "/login",
}: RoleGuardProps) {
  const { data: session, status } = useSession();

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (status === "unauthenticated") {
    redirect(
      `${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`,
    );
  }

  // Si la session est en cours de chargement, afficher un indicateur de chargement
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Vérifier si l'utilisateur a un rôle autorisé
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

  // L'utilisateur a un rôle autorisé, afficher le contenu
  return <>{children}</>;
}
