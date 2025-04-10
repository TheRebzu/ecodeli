import { UserRole } from "@prisma/client";

/**
 * Map legacy role strings to Prisma UserRole enum values
 */
export function mapRoleToPrisma(legacyRole: string): UserRole {
  switch (legacyRole.toUpperCase()) {
    case 'CLIENT':
      return UserRole.CUSTOMER;
    case 'LIVREUR':
      return UserRole.DELIVERY_PERSON;
    case 'COMMERCANT':
      return UserRole.MERCHANT;
    case 'PRESTATAIRE':
      return UserRole.SERVICE_PROVIDER;
    case 'ADMIN':
      return UserRole.ADMIN;
    default:
      return UserRole.CUSTOMER; // Default to CUSTOMER role
  }
}

/**
 * Map Prisma UserRole enum values to legacy role strings
 */
export function mapRoleFromPrisma(prismaRole: UserRole): string {
  switch (prismaRole) {
    case UserRole.CUSTOMER:
      return 'CLIENT';
    case UserRole.DELIVERY_PERSON:
      return 'LIVREUR';
    case UserRole.MERCHANT:
      return 'COMMERCANT';
    case UserRole.SERVICE_PROVIDER:
      return 'PRESTATAIRE';
    case UserRole.ADMIN:
      return 'ADMIN';
    default:
      return 'CLIENT'; // Default to CLIENT role
  }
}

/**
 * Check if a user has a specific role
 */
export function hasRole(userRole: UserRole | string | undefined, allowedRoles: (UserRole | string)[]): boolean {
  if (!userRole) return false;
  
  // Convert string role to Prisma enum if needed
  const normalizedUserRole = typeof userRole === 'string' && !Object.values(UserRole).includes(userRole as any) 
    ? mapRoleToPrisma(userRole) 
    : userRole;
  
  // Convert all allowed roles to Prisma enum values if they're strings
  const normalizedAllowedRoles = allowedRoles.map(role => 
    typeof role === 'string' && !Object.values(UserRole).includes(role as any)
      ? mapRoleToPrisma(role)
      : role
  );
  
  return normalizedAllowedRoles.includes(normalizedUserRole as UserRole);
} 