"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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

// Hook pour utiliser NextAuth côté client
export function useAuth() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading") {
      setIsLoading(false);
    }
  }, [status]);

  return {
    user: session?.user || null,
    isLoading,
    isAuthenticated: !!session?.user,
  };
}
