// Types liés à l'utilisateur et au bannissement
export interface UserBanInfo {
  isBanned: boolean; // Indique si l'utilisateur est banni
  bannedAt?: Date | null; // Date du bannissement
  bannedById?: string | null; // ID de l'admin ayant banni
  banReason?: string | null; // Raison du bannissement
}

export interface User extends UserBanInfo {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt?: Date | null;
  isVerified: boolean;
  phoneNumber?: string | null;
  // ...autres champs existants
}

// Enum pour l'action de bannissement
export enum UserBanAction {
  BAN = "BAN",
  UNBAN = "UNBAN",
}
