import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { db } from '../db';
import { UserRole, UserStatus } from '../db/enums';
import { authenticator } from 'otplib';

// Ensure we have a stable and consistent secret
const getAuthSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set in environment variables');
  }
  return secret;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: getAuthSecret(),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  jwt: {
    // Make JWT configuration more explicit to avoid issues
    maxAge: 60 * 60 * 24 * 30, // 30 days
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
        // Seuls les livreurs peuvent se connecter en état PENDING_VERIFICATION
        if (
          user.status !== UserStatus.ACTIVE &&
          !(user.status === UserStatus.PENDING_VERIFICATION && user.role === UserRole.DELIVERER)
        ) {
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
    async jwt({ token, user, trigger, session }) {
      // Quand l'utilisateur se connecte, fusionner ses données avec le token
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.status = user.status;
        token.isVerified = user.isVerified;
        token.picture = user.image; // Nextauth utilise 'picture' mais nous avons 'image'
      }

      // Lors d'une mise à jour de session
      if (trigger === 'update' && session) {
        Object.assign(token, session);
      }

      // Vérifier dynamiquement si l'utilisateur est vérifié à chaque requête pour les rôles qui nécessitent une vérification
      if (token.role === 'DELIVERER' || token.role === 'PROVIDER' || token.role === 'MERCHANT') {
        try {
          // Obtenir le statut actuel de l'utilisateur depuis la base de données
          const currentUser = await db.user.findUnique({
            where: { id: token.id as string },
            include: {
              deliverer: token.role === 'DELIVERER' ? true : undefined,
              provider: token.role === 'PROVIDER' ? true : undefined,
              merchant: token.role === 'MERCHANT' ? true : undefined,
            },
          });

          if (currentUser) {
            // Mettre à jour le token avec les informations actuelles
            token.status = currentUser.status;
            token.isVerified = currentUser.isVerified;

            // Mettre à jour également les informations spécifiques au rôle
            if (token.role === 'DELIVERER' && currentUser.deliverer) {
              token.isVerified = currentUser.deliverer.isVerified;
            } else if (token.role === 'PROVIDER' && currentUser.provider) {
              token.isVerified = currentUser.provider.isVerified;
            } else if (token.role === 'MERCHANT' && currentUser.merchant) {
              token.isVerified = currentUser.merchant.isVerified;
            }

            console.log(
              `Session mise à jour pour ${currentUser.email}: status=${token.status}, isVerified=${token.isVerified}`
            );
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour dynamique de la session:', error);
          // Ne pas bloquer le processus en cas d'erreur
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | undefined;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.isVerified = token.isVerified as boolean | undefined;
      }
      return session;
    },
  },
};
