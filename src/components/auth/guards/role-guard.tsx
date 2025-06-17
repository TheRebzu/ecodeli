"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
  showFallback?: boolean;
  requireAuth?: boolean;
}

/**
 * Composant garde-fou pour protéger l'accès aux composants selon les rôles utilisateur
 * Implémentation selon la Mission 1 - Gestion des permissions et de la sécurité
 */
export default function RoleGuard({
  children,
  allowedRoles,
  fallbackUrl = "/",
  showFallback = true,
  requireAuth = true
}: RoleGuardProps) {
  const { data: session, status } = useSession();
  const t = useTranslations("auth");

  // Chargement en cours
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Utilisateur non authentifié
  if (requireAuth && status === "unauthenticated") {
    if (showFallback) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                {t("accessDenied")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                {t("authenticationRequired")}
              </p>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/signin">
                    {t("signIn")}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={fallbackUrl}>
                    {t("goBack")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      redirect("/auth/signin");
    }
  }

  // Utilisateur authentifié mais rôle non autorisé
  if (session?.user && !allowedRoles.includes(session.user.role as UserRole)) {
    if (showFallback) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <User className="h-6 w-6 text-amber-500" />
                {t("insufficientPermissions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                {t("roleNotAuthorized", { 
                  currentRole: session.user.role, 
                  requiredRoles: allowedRoles.join(", ") 
                })}
              </p>
              <div className="space-y-2">
                <Button variant="outline" asChild className="w-full">
                  <Link href={getDashboardUrl(session.user.role as UserRole)}>
                    {t("goToDashboard")}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={fallbackUrl}>
                    {t("goBack")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    } else {
      redirect(getDashboardUrl(session.user.role as UserRole));
    }
  }

  // Accès autorisé
  return <>{children}</>;
}

/**
 * Fonction utilitaire pour obtenir l'URL du dashboard selon le rôle
 */
function getDashboardUrl(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "CLIENT":
      return "/client/dashboard";
    case "DELIVERER":
      return "/deliverer/dashboard";
    case "MERCHANT":
      return "/merchant/dashboard";
    case "PROVIDER":
      return "/provider/dashboard";
    default:
      return "/";
  }
}

/**
 * Hook utilitaire pour vérifier les permissions
 */
export function useRoleCheck() {
  const { data: session } = useSession();

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!session?.user?.role) return false;
    return allowedRoles.includes(session.user.role as UserRole);
  };

  const isAdmin = (): boolean => hasRole(["ADMIN"]);
  const isClient = (): boolean => hasRole(["CLIENT"]);
  const isDeliverer = (): boolean => hasRole(["DELIVERER"]);
  const isMerchant = (): boolean => hasRole(["MERCHANT"]);
  const isProvider = (): boolean => hasRole(["PROVIDER"]);

  return {
    hasRole,
    isAdmin,
    isClient,
    isDeliverer,
    isMerchant,
    isProvider,
    currentRole: session?.user?.role as UserRole | undefined
  };
}
