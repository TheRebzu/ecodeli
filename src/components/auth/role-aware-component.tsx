"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";

interface RoleAwareComponentProps {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}

/**
 * Composant qui affiche son contenu uniquement si l'utilisateur a l'un des rôles spécifiés
 * Utile pour afficher ou masquer des éléments d'interface en fonction du rôle de l'utilisateur
 * 
 * @param children Contenu à afficher si l'utilisateur a l'un des rôles spécifiés
 * @param roles Tableau des rôles autorisés à voir le contenu
 * @param fallback Contenu à afficher si l'utilisateur n'a pas les rôles requis (optionnel)
 */
export function RoleAwareComponent({ 
  children, 
  roles, 
  fallback = null 
}: RoleAwareComponentProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole | undefined;
  
  // Si l'utilisateur n'est pas connecté ou n'a pas l'un des rôles spécifiés, afficher le fallback
  if (!userRole || !roles.includes(userRole)) {
    return <>{fallback}</>;
  }
  
  // L'utilisateur a l'un des rôles spécifiés, afficher le contenu
  return <>{children}</>;
}

/**
 * Composant qui affiche son contenu uniquement si l'utilisateur est un administrateur
 */
export function AdminOnly({ children, fallback = null }: Omit<RoleAwareComponentProps, "roles">) {
  return (
    <RoleAwareComponent roles={["ADMIN"]} fallback={fallback}>
      {children}
    </RoleAwareComponent>
  );
}

/**
 * Composant qui affiche son contenu uniquement si l'utilisateur est un client
 */
export function ClientOnly({ children, fallback = null }: Omit<RoleAwareComponentProps, "roles">) {
  return (
    <RoleAwareComponent roles={["CLIENT"]} fallback={fallback}>
      {children}
    </RoleAwareComponent>
  );
}

/**
 * Composant qui affiche son contenu uniquement si l'utilisateur est un livreur
 */
export function DelivererOnly({ children, fallback = null }: Omit<RoleAwareComponentProps, "roles">) {
  return (
    <RoleAwareComponent roles={["DELIVERER"]} fallback={fallback}>
      {children}
    </RoleAwareComponent>
  );
}

/**
 * Composant qui affiche son contenu uniquement si l'utilisateur est un commerçant
 */
export function MerchantOnly({ children, fallback = null }: Omit<RoleAwareComponentProps, "roles">) {
  return (
    <RoleAwareComponent roles={["MERCHANT"]} fallback={fallback}>
      {children}
    </RoleAwareComponent>
  );
}

/**
 * Composant qui affiche son contenu uniquement si l'utilisateur est un prestataire
 */
export function ProviderOnly({ children, fallback = null }: Omit<RoleAwareComponentProps, "roles">) {
  return (
    <RoleAwareComponent roles={["PROVIDER"]} fallback={fallback}>
      {children}
    </RoleAwareComponent>
  );
}
