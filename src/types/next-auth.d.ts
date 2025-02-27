import { UserRole } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extension du type de session utilisateur
   */
  interface Session {
    user: {
      id: string;
      role: string;
      profileId?: string;
    } & DefaultSession["user"];
  }

  /**
   * Extension du type d'utilisateur
   */
  interface User {
    id: string;
    role: string;
    profileId?: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extension du token JWT
   */
  interface JWT {
    id: string;
    role: string;
    profileId?: string;
  }
}