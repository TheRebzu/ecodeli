import "next-auth";
import { DefaultSession } from "next-auth";

export enum Role {
  CLIENT = "CLIENT",
  DELIVERER = "DELIVERER",
  MERCHANT = "MERCHANT",
  PROVIDER = "PROVIDER",
  ADMIN = "ADMIN",
}

declare module "next-auth" {
  /**
   * Extends the built-in session types
   */
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  /**
   * Extends the built-in user types
   */
  interface User {
    id: string;
    role: Role;
    emailVerified?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the built-in JWT types
   */
  interface JWT {
    id: string;
    role: Role;
    emailVerified?: string | null;
  }
}
