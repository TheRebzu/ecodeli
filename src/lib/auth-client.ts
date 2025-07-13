"use client";

// Types pour EcoDeli
export type UserRole =
  | "CLIENT"
  | "DELIVERER"
  | "MERCHANT"
  | "PROVIDER"
  | "ADMIN";
export type ValidationStatus =
  | "PENDING"
  | "PENDING_DOCUMENTS"
  | "PENDING_VALIDATION"
  | "VALIDATED"
  | "REJECTED";

// Types pour la session NextAuth
export interface Session {
  user: {
    id: string;
    email: string;
    role: UserRole;
    status: ValidationStatus;
    firstName?: string;
    lastName?: string;
    phone?: string;
    language?: string;
    emailVerified?: boolean;
    profile?: any;
  };
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: ValidationStatus;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  emailVerified?: boolean;
  profile?: any;
}
