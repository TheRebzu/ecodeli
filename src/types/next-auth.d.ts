import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole } from "@/lib/validations/auth";

declare module "next-auth" {
  /**
   * Extension du type User dans la session
   */
  interface Session {
    user: {
      id: string;
      role: string;
      status: string;
      mfaEnabled?: boolean;
    } & DefaultSession["user"];
  }

  /**
   * Extension du type User
   */
  interface User extends DefaultUser {
    id: string;
    role: UserRole;
    status: string;
    mfaEnabled?: boolean;
    mfaSecret?: string;
    mfaBackupCodes?: string[];
    lastLogin?: Date;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extension du type JWT
   */
  interface JWT {
    id: string;
    role: string;
    status: string;
    mfaEnabled?: boolean;
  }
} 