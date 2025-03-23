import { getServerSession } from "next-auth";
<<<<<<< HEAD
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";

// Copie de la configuration d'authentification pour l'utiliser dans getSession
export const authConfig: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await compare(credentials.password, user.password);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
=======
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { User } from "@prisma/client";

// Type pour l'utilisateur dans la session
export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  status: string;
}

// Type pour la session avec l'utilisateur
export interface Session {
  user: SessionUser;
}
>>>>>>> 5b14b134948ec7b19d55a9a8fff5829e7f796b19

/**
 * Cette fonction récupère la session depuis getServerSession
 * NE PAS UTILISER DANS UN CONTEXTE CACHÉ (unstable_cache)
 */
export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return session as Session | null;
}

/**
 * Récupère l'utilisateur courant complet depuis la base de données
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
}

/**
 * Récupère seulement l'ID utilisateur de la session
 * Pour utilisation dans unstable_cache
 */
export async function getUserIdFromSession() {
  const session = await getSession();
  return session?.user?.id || null;
}

// Vérifier si l'utilisateur est connecté
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Vérifier si l'utilisateur a un rôle spécifique
export async function hasRole(role: string | string[]): Promise<boolean> {
  const session = await getSession();
  
  if (!session) {
    return false;
  }
  
  if (Array.isArray(role)) {
    return role.includes(session.user.role);
  }
  
  return session.user.role === role;
} 