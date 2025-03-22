import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extension du type User dans la session
   */
  interface Session {
    user: {
      id: string;
      role: string;
      status: string;
    } & DefaultSession["user"];
  }

  /**
   * Extension du type User
   */
  interface User {
    id: string;
    role: string;
    status: string;
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
  }
} 