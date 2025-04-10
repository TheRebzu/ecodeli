<<<<<<< Updated upstream
import type { DefaultSession } from "next-auth";
=======
import { UserRole } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";
>>>>>>> Stashed changes

declare module "next-auth" {
  /**
   * Extend the built-in User interface to include role
   */
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }

  /**
   * Extend the built-in session interface to include user.role
   */
  interface Session {
    user: {
      id: string;
<<<<<<< Updated upstream
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
=======
      name: string;
      email: string;
      role: UserRole;
    };
>>>>>>> Stashed changes
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the JWT interface to include user ID and role
   */
  interface JWT {
    id: string;
<<<<<<< Updated upstream
    role: string;
    status: string;
=======
    role: UserRole;
>>>>>>> Stashed changes
  }
} 