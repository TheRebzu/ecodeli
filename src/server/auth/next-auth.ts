import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { db } from '../db';
import { UserRole, UserStatus } from '../db/enums';
import { authenticator } from 'otplib';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
    newUser: '/welcome',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
        totp: { label: "Code d'authentification", type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis');
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
          throw new Error('Utilisateur non trouvé');
        }

        // Vérifier si l'email est vérifié
        if (!user.emailVerified) {
          throw new Error('Veuillez vérifier votre email avant de vous connecter');
        }

        // Vérifier si l'utilisateur est actif
        if (user.status !== UserStatus.ACTIVE) {
          throw new Error('Votre compte est ' + user.status.toLowerCase());
        }

        // Vérifier le mot de passe
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error('Mot de passe incorrect');
        }

        // Vérifier la 2FA si activée
        if (user.twoFactorEnabled) {
          if (!credentials.totp) {
            throw new Error("Code d'authentification à deux facteurs requis");
          }

          // Vérification du code TOTP avec otplib
          const isValidTotp = authenticator.verify({
            token: credentials.totp,
            secret: user.twoFactorSecret || '',
          });

          if (!isValidTotp) {
            throw new Error("Code d'authentification incorrect");
          }
        }

        // Déterminer si l'utilisateur est vérifié selon son rôle
        let isVerified = true; // Par défaut, les comptes sont considérés comme vérifiés
        const status = user.status;

        // Déterminer le profileId en fonction du rôle
        let profileId: string | undefined;

        // Pour les livreurs, vérifier s'ils sont vérifiés
        if (user.role === UserRole.DELIVERER && user.deliverer) {
          isVerified = user.deliverer.isVerified;
          profileId = user.deliverer.id;
        }
        // Pour les commerçants, vérifier s'ils sont vérifiés
        else if (user.role === UserRole.MERCHANT && user.merchant) {
          isVerified = user.merchant.isVerified;
          profileId = user.merchant.id;
        }
        // Pour les prestataires, vérifier s'ils sont vérifiés
        else if (user.role === UserRole.PROVIDER && user.provider) {
          isVerified = user.provider.isVerified;
          profileId = user.provider.id;
        }
        // Pour les clients, pas de vérification nécessaire
        else if (user.role === UserRole.CLIENT && user.client) {
          profileId = user.client.id;
        }
        // Pour les admins, pas de vérification nécessaire
        else if (user.role === UserRole.ADMIN && user.admin) {
          profileId = user.admin.id;
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
          status,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          isVerified: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.profileId = user.profileId;
        token.isVerified = user.isVerified;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.profileId = token.profileId;
        session.user.isVerified = token.isVerified as boolean;
        session.user.status = token.status;
      }
      return session;
    },
  },
};
