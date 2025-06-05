import { type GetServerSidePropsContext } from 'next';
import { getServerSession, type NextAuthOptions, type DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/server/db';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Module augmentation pour Next Auth
 * Note: Utilisation du type casting pour contourner les problèmes de compatibilité
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      isVerified?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: UserRole;
    isVerified?: boolean;
  }
}

/**
 * Options pour NextAuth
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
        session.user.role = token.role as UserRole;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
        token.isVerified = user.isVerified;
      }
      return token;
    },
  },
  // Utilisation de as any pour contourner les problèmes de typage
  adapter: PrismaAdapter(db) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // Utilisation de as any pour contourner les problèmes de typage
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Identifiants invalides');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Identifiants invalides');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Identifiants invalides');
        }

        // Utilisation du type as any pour contourner les incompatibilités
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isVerified: user.isVerified,
        } as any;
      },
    } as any),
  ],
  pages: {
    signIn: '/fr/login',
    newUser: '/fr/register',
    error: '/fr/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Fonction pour obtenir la session côté serveur
 * Compatible avec les deux approches (Pages Router et App Router)
 */
export const getServerAuthSession = (ctx?: {
  req: GetServerSidePropsContext['req'];
  res: GetServerSidePropsContext['res'];
}) => {
  if (ctx?.req && ctx?.res) {
    // Pages Router: utilisation des objets req et res
    return getServerSession(ctx.req, ctx.res, authOptions);
  }
  // App Router: utilisation sans contexte spécifique
  return getServerSession(authOptions);
};
