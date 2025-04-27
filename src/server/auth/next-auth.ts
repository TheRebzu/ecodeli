import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "../db";
import { UserRole, UserStatus } from "../db/enums";

export const authOptions: NextAuthOptions = {
  // Le type générique pour l'adaptateur prisma est différent de ce que NextAuth attend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
    newUser: "/welcome",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        totp: { label: "Code d'authentification", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        // Rechercher l'utilisateur par email
        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            emailVerified: true,
            role: true,
            status: true,
            image: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            client: { select: { id: true } },
            deliverer: { select: { id: true, isVerified: true } },
            merchant: { select: { id: true, isVerified: true } },
            provider: { select: { id: true, isVerified: true } },
            admin: { select: { id: true } },
          },
        });

        if (!user) {
          throw new Error("Utilisateur non trouvé");
        }

        // Vérifier si l'email est vérifié
        if (!user.emailVerified) {
          throw new Error("Veuillez vérifier votre email avant de vous connecter");
        }

        // Vérifier si l'utilisateur est actif
        if (user.status !== UserStatus.ACTIVE) {
          throw new Error("Votre compte est " + user.status.toLowerCase());
        }

        // Vérifier le mot de passe
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("Mot de passe incorrect");
        }

        // Vérifier la 2FA si activée
        if (user.twoFactorEnabled) {
          if (!credentials.totp) {
            throw new Error("Code d'authentification à deux facteurs requis");
          }
          
          // Vérification du code TOTP - à implémenter avec une bibliothèque comme otplib
          // const isValidTotp = authenticator.verify({
          //   token: credentials.totp,
          //   secret: user.twoFactorSecret || '',
          // });
          
          // if (!isValidTotp) {
          //   throw new Error("Code d'authentification incorrect");
          // }
        }

        // Obtenir l'ID du profil spécifique au rôle
        let profileId = null;
        let isVerified = false;

        switch (user.role) {
          case UserRole.CLIENT:
            profileId = user.client?.id;
            isVerified = true; // Les clients n'ont pas besoin de vérification spécifique
            break;
          case UserRole.DELIVERER:
            profileId = user.deliverer?.id;
            isVerified = user.deliverer?.isVerified || false;
            break;
          case UserRole.MERCHANT:
            profileId = user.merchant?.id;
            isVerified = user.merchant?.isVerified || false;
            break;
          case UserRole.PROVIDER:
            profileId = user.provider?.id;
            isVerified = user.provider?.isVerified || false;
            break;
          case UserRole.ADMIN:
            profileId = user.admin?.id;
            isVerified = true; // Les admins sont considérés comme vérifiés par défaut
            break;
        }

        // Mise à jour de la date de dernière connexion
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          profileId,
          isVerified,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: UserRole.CLIENT, // Par défaut, les utilisateurs Google sont des clients
          status: UserStatus.ACTIVE,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          profileId: user.profileId,
          isVerified: user.isVerified,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.profileId = token.profileId as string | undefined;
        session.user.isVerified = token.isVerified as boolean | undefined;
      }
      return session;
    },
  },
};