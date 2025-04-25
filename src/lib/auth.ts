import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { type UserRole } from "@prisma/client";

/**
 * Module qui définit la configuration d'authentification pour l'application EcoDeli
 * Utilise NextAuth.js avec l'adaptateur Prisma pour la gestion des sessions et des utilisateurs
 */

// Déclaration des types pour étendre les types par défaut de NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string;
      role: UserRole;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    image?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    picture?: string | null;
  }
}

// Configuration principale de NextAuth
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    verifyRequest: "/verify-email",
    newUser: "/onboarding",
  },
  providers: [
    // Authentification avec Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    // Authentification avec email/mot de passe
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Veuillez saisir votre email et votre mot de passe");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) {
          throw new Error("Email ou mot de passe incorrect");
        }

        if (!user.password) {
          throw new Error("Veuillez vous connecter avec votre compte Google");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Email ou mot de passe incorrect");
        }

        if (!user.emailVerified) {
          throw new Error(
            "Veuillez vérifier votre adresse email avant de vous connecter",
          );
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    // Callback pour personnaliser la session
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.image = token.picture;
      }
      return session;
    },
    // Callback pour personnaliser le JWT
    async jwt({ token, user, trigger, session }) {
      // Connexion initiale
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Mise à jour du token si l'utilisateur met à jour ses données
      if (trigger === "update" && session) {
        token.name = session.user.name;
        token.email = session.user.email;
        token.picture = session.user.image;
      }

      return token;
    },
    // Callback pour la redirection après connexion
    async redirect({ url, baseUrl }) {
      // Redirection vers la page d'origine ou le tableau de bord par défaut
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {
      // Mise à jour de la date de dernière connexion
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};

/**
 * Récupère la session utilisateur côté serveur
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Récupère l'utilisateur actuellement connecté avec ses informations complètes
 */
export async function getCurrentUser() {
  const session = await getSession();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      emailVerified: true,
      clientProfile: true,
      delivererProfile: true,
      serviceProvider: true,
    },
  });

  return user;
}

/**
 * Hache un mot de passe
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Vérifie si un mot de passe correspond au hash stocké
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Vérifie si un utilisateur a un rôle spécifique
 */
export function hasRole(role: UserRole, userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  return userRole === role;
}

/**
 * Vérifie si un utilisateur est administrateur
 */
export function isAdmin(userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  return userRole === "ADMIN";
}

/**
 * Vérifie si un utilisateur est un livreur
 */
export function isDeliverer(userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  return userRole === "DELIVERER";
}

/**
 * Vérifie si un utilisateur est un commerçant
 */
export function isMerchant(userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  return userRole === "MERCHANT";
}

/**
 * Vérifie si un utilisateur est un prestataire de services
 */
export function isProvider(userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  return userRole === "PROVIDER";
}

/**
 * Vérifie si un utilisateur est un client
 */
export function isClient(userRole?: UserRole | null): boolean {
  if (!userRole) return false;
  return userRole === "CLIENT";
}
