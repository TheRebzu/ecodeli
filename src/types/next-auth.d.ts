import { DefaultSession } from 'next-auth';
import { UserRole, UserStatus } from '@prisma/client';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: UserRole;
      status: UserStatus;
      isVerified?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: UserRole;
    status: UserStatus;
    isVerified?: boolean;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    name: string;
    email: string;
    picture?: string;
    role: UserRole;
    status: UserStatus;
    isVerified?: boolean;
  }
}
