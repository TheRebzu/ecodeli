"use client";

import { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { UserRole } from "@prisma/client";

interface ProtectedLayoutProps {
  children: ReactNode;
  roles?: UserRole[];
}

/**
 * Layout pour les pages qui nécessitent une authentification
 * Peut être utilisé avec des rôles spécifiques pour restreindre l'accès
 */
export default function ProtectedLayout({
  children,
  roles,
}: ProtectedLayoutProps) {
  return (
    <AuthGuard allowedRoles={roles} requireAuth={true}>
      {children}
    </AuthGuard>
  );
}
