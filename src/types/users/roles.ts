// Types pour les rôles utilisateur
export type UserRole =
  | "CLIENT"
  | "DELIVERER"
  | "MERCHANT"
  | "PROVIDER"
  | "ADMIN";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "BANNED"
  | "PENDING_VERIFICATION"
  | "VERIFICATION_REJECTED";

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  restrictions: Restriction[];
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface Restriction {
  type: "TIME" | "LOCATION" | "AMOUNT" | "FREQUENCY";
  rule: string;
  value: any;
}

export interface UserRoleInfo {
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  canUpgrade: boolean;
  upgradeOptions: UserRole[];
  roleSpecificData?: Record<string, any>;
}

export interface RoleTransition {
  fromRole: UserRole;
  toRole: UserRole;
  requirements: string[];
  verificationNeeded: boolean;
  fee?: number;
  processingTime: number; // en jours
}
