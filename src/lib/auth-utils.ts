/**
 * Utilitaires pour l'authentification
 */

// Les rôles disponibles dans l'application
export enum UserRole {
  ADMIN = "ADMIN",
  CLIENT = "CLIENT",
  COURIER = "COURIER",
  MERCHANT = "MERCHANT",
  PROVIDER = "PROVIDER"
}

// Sous-systèmes de l'application
export enum AppSystem {
  PROFILE = "profile",
  ORDERS = "orders",
  DELIVERIES = "deliveries",
  PRODUCTS = "products",
  ANALYTICS = "analytics",
  ANNOUNCEMENTS = "announcements",
  USERS = "users",
  SERVICES = "services",
  PAYMENTS = "payments",
  ADMIN = "admin"
}

// Actions possibles sur les ressources
export enum ActionType {
  VIEW = "view",
  CREATE = "create",
  EDIT = "edit",
  DELETE = "delete",
  MANAGE = "manage", // Implique toutes les actions
  APPROVE = "approve",
  REJECT = "reject",
  DOWNLOAD = "download",
}

/**
 * Types pour les permissions
 */
export type Permission = `${ActionType}_${string}`;
export type PermissionSet = Set<Permission>;

/**
 * Convertit une chaîne de rôle en UserRole enum
 */
export function mapRoleToPrisma(role: string): UserRole {
  if (!role) return UserRole.CLIENT; // Par défaut
  
  const upperRole = role.toUpperCase();
  
  // Vérifier si le rôle est valide
  if (Object.values(UserRole).includes(upperRole as UserRole)) {
    return upperRole as UserRole;
  }
  
  // Mappages pour les cas particuliers
  switch (upperRole) {
    case "USER":
    case "CUSTOMER":
      return UserRole.CLIENT;
    case "DELIVERY":
    case "DELIVERER":
    case "DRIVER":
    case "LIVREUR":
      return UserRole.COURIER;
    case "STORE":
    case "SHOP":
    case "VENDOR":
    case "COMMERCANT":
    case "COMMERÇANT":
      return UserRole.MERCHANT;
    case "SERVICE":
    case "SERVICEPROVIER":
    case "PRESTATAIRE":
      return UserRole.PROVIDER;
    case "ADMINISTRATOR":
    case "SUPERADMIN":
    case "SUPER_ADMIN":
      return UserRole.ADMIN;
    default:
      return UserRole.CLIENT;
  }
}

/**
 * Vérifie si un utilisateur a un rôle spécifique
 */
export function hasRole(userRole: string | null | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  
  const normalizedRole = mapRoleToPrisma(userRole);
  return requiredRoles.includes(normalizedRole);
}

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export function hasPermission(userRole: string | null | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  
  const normalizedRole = mapRoleToPrisma(userRole.toString());
  const permissions = getUserPermissions(normalizedRole);
  
  return permissions.has(permission);
}

/**
 * Vérifie si un utilisateur a toutes les permissions spécifiées
 */
export function hasAllPermissions(userRole: string | null | undefined, permissions: Permission[]): boolean {
  if (!userRole || permissions.length === 0) return false;
  
  const normalizedRole = mapRoleToPrisma(userRole.toString());
  const userPermissions = getUserPermissions(normalizedRole);
  
  return permissions.every(permission => userPermissions.has(permission));
}

/**
 * Vérifie si un utilisateur a au moins une des permissions spécifiées
 */
export function hasAnyPermission(userRole: string | null | undefined, permissions: Permission[]): boolean {
  if (!userRole || permissions.length === 0) return false;
  
  const normalizedRole = mapRoleToPrisma(userRole.toString());
  const userPermissions = getUserPermissions(normalizedRole);
  
  return permissions.some(permission => userPermissions.has(permission));
}

/**
 * Récupère les permissions d'un utilisateur en fonction de son rôle
 */
export function getUserPermissions(role: UserRole | string | null): PermissionSet {
  const normalizedRole = role ? mapRoleToPrisma(role.toString()) : null;
  
  // Permissions de base pour tous les utilisateurs authentifiés
  const basePermissions = new Set<Permission>([
    `${ActionType.VIEW}_${AppSystem.PROFILE}`,
    `${ActionType.EDIT}_${AppSystem.PROFILE}`,
  ]);
  
  switch (normalizedRole) {
    case UserRole.ADMIN:
      return new Set<Permission>([
        // Permissions de base
        ...basePermissions,
        // Permissions administrateur
        `${ActionType.MANAGE}_${AppSystem.USERS}`,
        `${ActionType.MANAGE}_${AppSystem.ADMIN}`,
        `${ActionType.VIEW}_${AppSystem.ANALYTICS}`,
        `${ActionType.MANAGE}_${AppSystem.PRODUCTS}`,
        `${ActionType.MANAGE}_${AppSystem.ORDERS}`,
        `${ActionType.MANAGE}_${AppSystem.DELIVERIES}`,
        `${ActionType.MANAGE}_${AppSystem.SERVICES}`,
        `${ActionType.MANAGE}_${AppSystem.PAYMENTS}`,
        `${ActionType.MANAGE}_${AppSystem.ANNOUNCEMENTS}`,
      ]);
    case UserRole.CLIENT:
      return new Set<Permission>([
        // Permissions de base
        ...basePermissions,
        // Permissions client
        `${ActionType.CREATE}_${AppSystem.ORDERS}`,
        `${ActionType.VIEW}_${AppSystem.ORDERS}`,
        `${ActionType.EDIT}_${AppSystem.ORDERS}`,
        `${ActionType.VIEW}_${AppSystem.PRODUCTS}`,
        `${ActionType.VIEW}_${AppSystem.DELIVERIES}`,
        `${ActionType.VIEW}_${AppSystem.ANNOUNCEMENTS}`,
        `${ActionType.VIEW}_${AppSystem.SERVICES}`,
      ]);
    case UserRole.COURIER:
      return new Set<Permission>([
        // Permissions de base
        ...basePermissions,
        // Permissions livreur
        `${ActionType.VIEW}_${AppSystem.DELIVERIES}`,
        `${ActionType.EDIT}_${AppSystem.DELIVERIES}`,
        `${ActionType.VIEW}_${AppSystem.ORDERS}`,
        `${ActionType.VIEW}_${AppSystem.ANALYTICS}`,
      ]);
    case UserRole.MERCHANT:
      return new Set<Permission>([
        // Permissions de base
        ...basePermissions,
        // Permissions commerçant
        `${ActionType.MANAGE}_${AppSystem.PRODUCTS}`,
        `${ActionType.VIEW}_${AppSystem.ANALYTICS}`,
        `${ActionType.VIEW}_${AppSystem.ORDERS}`,
        `${ActionType.EDIT}_${AppSystem.ORDERS}`,
        `${ActionType.CREATE}_${AppSystem.ANNOUNCEMENTS}`,
        `${ActionType.VIEW}_${AppSystem.ANNOUNCEMENTS}`,
        `${ActionType.VIEW}_${AppSystem.DELIVERIES}`,
      ]);
    case UserRole.PROVIDER:
      return new Set<Permission>([
        // Permissions de base
        ...basePermissions,
        // Permissions prestataire
        `${ActionType.MANAGE}_${AppSystem.SERVICES}`,
        `${ActionType.VIEW}_${AppSystem.ANALYTICS}`,
        `${ActionType.CREATE}_${AppSystem.ANNOUNCEMENTS}`,
        `${ActionType.VIEW}_${AppSystem.ANNOUNCEMENTS}`,
      ]);
    default:
      return basePermissions;
  }
}

/**
 * Obtient la liste des actions autorisées pour un utilisateur sur un système donné
 */
export function getAllowedActions(role: UserRole | string | null, system: AppSystem): ActionType[] {
  const permissions = getUserPermissions(role);
  const allowedActions = [];
  
  // Si l'utilisateur a la permission MANAGE, il a toutes les actions sur ce système
  if (permissions.has(`${ActionType.MANAGE}_${system}`)) {
    return Object.values(ActionType);
  }
  
  // Sinon, vérifier chaque action individuellement
  for (const action of Object.values(ActionType)) {
    if (permissions.has(`${action}_${system}`)) {
      allowedActions.push(action);
    }
  }
  
  return allowedActions;
}

/**
 * Obtient la liste des systèmes accessibles pour un utilisateur
 */
export function getAccessibleSystems(role: UserRole | string | null): AppSystem[] {
  const permissions = getUserPermissions(role);
  const accessibleSystems = new Set<AppSystem>();
  
  // Parcourir toutes les permissions pour extraire les systèmes
  for (const permission of permissions) {
    const [action, system] = permission.split('_');
    if (system && Object.values(AppSystem).includes(system as AppSystem)) {
      accessibleSystems.add(system as AppSystem);
    }
  }
  
  return Array.from(accessibleSystems);
} 