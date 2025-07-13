"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import {
  UserRole,
  Permission,
  hasPermission,
  canAccessRoute,
} from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";

interface AuthorizationGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthorizationGuard({
  children,
  requiredRole,
  requiredPermission,
  allowedRoles,
  fallback,
  redirectTo,
}: AuthorizationGuardProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Loading state
  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Vérification des permissions...</span>
      </div>
    );
  }

  // Not authenticated
  if (!session?.user) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }

    return (
      fallback || (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">
                Authentification requise
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Vous devez être connecté pour accéder à cette fonctionnalité.
            </p>
            <Button onClick={() => router.push("/login")}>Se connecter</Button>
          </CardContent>
        </Card>
      )
    );
  }

  const userRole = session.user.role as UserRole;

  // Check specific role requirement
  if (requiredRole && userRole !== requiredRole && userRole !== "ADMIN") {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }

    return (
      fallback || (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">Accès refusé</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Vous n'avez pas les permissions nécessaires (rôle {requiredRole}{" "}
              requis).
            </p>
          </CardContent>
        </Card>
      )
    );
  }

  // Check allowed roles
  if (
    allowedRoles &&
    !allowedRoles.includes(userRole) &&
    userRole !== "ADMIN"
  ) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }

    return (
      fallback || (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">Accès refusé</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Votre rôle ne vous permet pas d'accéder à cette fonctionnalité.
            </p>
          </CardContent>
        </Card>
      )
    );
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }

    return (
      fallback || (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">
                Permission insuffisante
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Vous n'avez pas la permission requise : {requiredPermission}
            </p>
          </CardContent>
        </Card>
      )
    );
  }

  // All checks passed
  return <>{children}</>;
}

// Hook pour vérifier les permissions dans les composants
export function usePermissions() {
  const { data: session } = useSession();

  const hasRole = (role: UserRole): boolean => {
    if (!session?.user) return false;
    const userRole = session.user.role as UserRole;
    return userRole === role || userRole === "ADMIN";
  };

  const hasPermissionCheck = (permission: Permission): boolean => {
    if (!session?.user) return false;
    const userRole = session.user.role as UserRole;
    return hasPermission(userRole, permission);
  };

  const canAccess = (route: string): boolean => {
    if (!session?.user) return false;
    const userRole = session.user.role as UserRole;
    return canAccessRoute(userRole, route);
  };

  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    hasRole,
    hasPermission: hasPermissionCheck,
    canAccess,
    isAdmin: hasRole("ADMIN"),
    isClient: hasRole("CLIENT"),
    isDeliverer: hasRole("DELIVERER"),
    isMerchant: hasRole("MERCHANT"),
    isProvider: hasRole("PROVIDER"),
  };
}
