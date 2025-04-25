import { UserRole } from "@prisma/client";

/**
 * Définition des rôles utilisateurs dans l'application EcoDeli
 */

// Liste des rôles disponibles dans l'application
export const ROLES = {
  CLIENT: "CLIENT",
  DELIVERER: "DELIVERER",
  MERCHANT: "MERCHANT",
  PROVIDER: "PROVIDER",
  ADMIN: "ADMIN",
} as const;

// Permissions associées à chaque rôle
export const ROLE_PERMISSIONS = {
  [ROLES.CLIENT]: [
    "create:announcement",
    "read:own_announcements",
    "update:own_announcements",
    "delete:own_announcements",
    "read:deliverers",
    "read:merchants",
    "read:providers",
    "create:payment",
    "read:own_payments",
  ],
  [ROLES.DELIVERER]: [
    "read:announcements",
    "update:own_profile",
    "read:own_deliveries",
    "update:own_deliveries",
    "read:warehouses",
    "read:boxes",
  ],
  [ROLES.MERCHANT]: [
    "create:announcement",
    "read:own_announcements",
    "update:own_announcements",
    "delete:own_announcements",
    "read:own_store",
    "update:own_store",
    "read:deliverers",
    "create:payment",
    "read:own_payments",
    "read:own_invoices",
  ],
  [ROLES.PROVIDER]: [
    "read:service_requests",
    "update:own_profile",
    "read:own_services",
    "update:own_services",
    "read:own_payments",
  ],
  [ROLES.ADMIN]: [
    "read:all_users",
    "update:all_users",
    "delete:all_users",
    "read:all_announcements",
    "update:all_announcements",
    "delete:all_announcements",
    "read:all_deliveries",
    "update:all_deliveries",
    "read:all_services",
    "update:all_services",
    "read:all_payments",
    "update:all_payments",
    "read:all_invoices",
    "create:invoice",
    "update:all_invoices",
    "verify:documents",
    "manage:warehouses",
    "manage:boxes",
  ],
};

/**
 * Vérifie si un utilisateur a une permission spécifique
 * @param userRole Le rôle de l'utilisateur
 * @param permission La permission à vérifier
 * @returns true si l'utilisateur a la permission, false sinon
 */
export function hasPermission(
  userRole: UserRole | undefined | null,
  permission: string,
): boolean {
  if (!userRole) return false;

  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;

  return permissions.includes(permission);
}

/**
 * Obtient toutes les permissions d'un rôle
 * @param role Le rôle dont on veut les permissions
 * @returns Un tableau des permissions associées au rôle
 */
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Obtient un libellé lisible pour un rôle
 * @param role Le rôle à traduire
 * @returns Le libellé du rôle en français
 */
export function getRoleLabel(role: UserRole): string {
  const roleLabels: Record<UserRole, string> = {
    CLIENT: "Client",
    DELIVERER: "Livreur",
    MERCHANT: "Commerçant",
    PROVIDER: "Prestataire",
    ADMIN: "Administrateur",
  };

  return roleLabels[role] || role;
}

/**
 * Obtient la route du tableau de bord pour un rôle spécifique
 * @param role Le rôle de l'utilisateur
 * @returns Le chemin vers le tableau de bord correspondant au rôle
 */
export function getDashboardPathForRole(role: UserRole): string {
  const dashboardPaths: Record<UserRole, string> = {
    CLIENT: "/client/dashboard",
    DELIVERER: "/deliverer/dashboard",
    MERCHANT: "/merchant/dashboard",
    PROVIDER: "/provider/dashboard",
    ADMIN: "/admin/dashboard",
  };

  return dashboardPaths[role] || "/";
}
