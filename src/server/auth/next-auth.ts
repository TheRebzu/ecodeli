import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "@/server/db";
import { UserRole, UserStatus } from "@/server/db/enums";
import { authenticator } from "otplib";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";

// Configuration sécurisée pour la clé secrète
const getAuthSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("⚠️ NEXTAUTH_SECRET non défini dans les variables d'environnement");
  }
  if (secret.length < 32) {
    throw new Error("⚠️ NEXTAUTH_SECRET doit contenir au moins 32 caractères");
  }
  return secret;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  secret: getAuthSecret(),
  
  // Configuration de session sécurisée
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60, // Mise à jour toutes les 24h
  },
  
  // Configuration JWT sécurisée
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    // Algorithme de chiffrement sécurisé
    secret: getAuthSecret(),
  },
  
  // Pages personnalisées
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
    newUser: "/welcome",
  },
  
  // Configuration des providers
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email",
          placeholder: "votre@email.com"
        },
        password: { 
          label: "Mot de passe", 
          type: "password",
          placeholder: "••••••••"
        },
        totp: { 
          label: "Code d'authentification", 
          type: "text",
          placeholder: "123456"
        },
      },
      
      async authorize(credentials, req) {
        // Validation stricte des entrées
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        // Vérification du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(credentials.email)) {
          throw new Error("Format d'email invalide");
        }

        // Sécurité : Vérifier l'origine de la requête
        if (req && req.headers) {
          const userAgent = req.headers["user-agent"];
          const referer = req.headers.referer;
          
          // Bloquer les requêtes suspectes
          if (!userAgent || userAgent.includes("curl") || userAgent.includes("wget")) {
            console.warn("🚨 Tentative de connexion suspecte bloquée:", {
              userAgent,
              ip: req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
            });
            throw new Error("Requête non autorisée");
          }
        }

        try {
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
            // Log de sécurité sans exposer d'informations
            console.warn("🚨 Tentative de connexion avec email inexistant:", {
              email: credentials.email.split('@')[0] + '@***',
              timestamp: new Date().toISOString(),
            });
            throw new Error("Identifiants invalides");
          }

          // Vérifier si l'email est vérifié
          if (!user.emailVerified) {
            throw new Error("Veuillez vérifier votre email avant de vous connecter");
          }

          // Vérifier si l'utilisateur est actif
          if (
            user.status !== UserStatus.ACTIVE &&
            !(
              user.status === UserStatus.PENDING_VERIFICATION &&
              user.role === UserRole.DELIVERER
            )
          ) {
            throw new Error("Votre compte est " + user.status.toLowerCase());
          }

          // Vérifier le mot de passe
          const isPasswordValid = await compare(credentials.password, user.password);
          if (!isPasswordValid) {
            // Log de sécurité
            console.warn("🚨 Tentative de connexion avec mot de passe incorrect:", {
              userId: user.id,
              email: user.email.split('@')[0] + '@***',
              timestamp: new Date().toISOString(),
            });
            throw new Error("Identifiants invalides");
          }

          // Vérifier la 2FA si activée
          if (user.twoFactorEnabled) {
            if (!credentials.totp) {
              throw new Error("Code d'authentification à deux facteurs requis");
            }

            const isValidTotp = authenticator.verify({
              token: credentials.totp,
              secret: user.twoFactorSecret || "",
            });

            if (!isValidTotp) {
              throw new Error("Code d'authentification incorrect");
            }
          }

          // Déterminer le profileId et la vérification selon le rôle
          let isVerified = true;
          let profileId: string | undefined;

          switch (user.role) {
            case UserRole.DELIVERER:
              if (user.deliverer) {
                isVerified = user.deliverer.isVerified;
                profileId = user.deliverer.id;
              }
              break;
            case UserRole.MERCHANT:
              if (user.merchant) {
                isVerified = user.merchant.isVerified;
                profileId = user.merchant.id;
              }
              break;
            case UserRole.PROVIDER:
              if (user.provider) {
                isVerified = user.provider.isVerified;
                profileId = user.provider.id;
              }
              break;
            case UserRole.CLIENT:
              if (user.client) {
                profileId = user.client.id;
              }
              break;
            case UserRole.ADMIN:
              if (user.admin) {
                profileId = user.admin.id;
              }
              break;
          }

          // Mise à jour de la date de dernière connexion
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          // Log de connexion réussie (sécurisé)
          console.info("✅ Connexion réussie:", {
            userId: user.id,
            role: user.role,
            timestamp: new Date().toISOString(),
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            profileId,
            isVerified,
            status: user.status,
          };
        } catch (error) {
          // Log d'erreur sécurisé
          console.error("❌ Erreur d'authentification:", {
            error: error instanceof Error ? error.message : "Erreur inconnue",
            timestamp: new Date().toISOString(),
          });
          throw error;
        }
      },
    }),
    
    // Provider Google sécurisé
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
  
  // Callbacks sécurisés
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Lors de la première connexion
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.status = user.status;
        token.isVerified = user.isVerified;
        token.picture = user.image;
        token.profileId = user.profileId;
      }

      // Lors d'une mise à jour de session
      if (trigger === "update" && session) {
        Object.assign(token, session);
      }

      // Vérification dynamique pour les rôles nécessitant une vérification
      if (
        token.role === "DELIVERER" ||
        token.role === "PROVIDER" ||
        token.role === "MERCHANT"
      ) {
        try {
          // Obtenir le statut actuel de l'utilisateur depuis la base de données
          const currentUser = await db.user.findUnique({
            where: { id: token.id as string },
            include: {
              deliverer: token.role === "DELIVERER" ? true : undefined,
              provider: token.role === "PROVIDER" ? true : undefined,
              merchant: token.role === "MERCHANT" ? true : undefined}});

          if (currentUser) {
            // Mettre à jour le token avec les informations actuelles
            token.status = currentUser.status;
            token.isVerified = currentUser.isVerified;

            // Mettre à jour également les informations spécifiques au rôle
            if (token.role === "DELIVERER" && currentUser.deliverer) {
              token.isVerified = currentUser.deliverer.isVerified;
            } else if (token.role === "PROVIDER" && currentUser.provider) {
              token.isVerified = currentUser.provider.isVerified;
            } else if (token.role === "MERCHANT" && currentUser.merchant) {
              token.isVerified = currentUser.merchant.isVerified;
            }

            console.log(
              `Session mise à jour pour ${currentUser.email}: status=${token.status}, isVerified=${token.isVerified}`,
            );
          }
        } catch (error) {
          console.error(
            "Erreur lors de la mise à jour dynamique de la session:",
            error,
          );
          // Ne pas bloquer le processus en cas d'erreur
        }
      }

      return token;
    },

    async session({ session, token  }) {
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
    }}};

/**
 * Fonction pour obtenir la session côté serveur
 * Compatible avec les deux approches (Pages Router et App Router)
 */
export const getServerAuthSession = (ctx?: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  if (ctx?.req && ctx?.res) {
    // Pages Router: utilisation des objets req et res
    return getServerSession(ctx.req, ctx.res, authOptions);
  }
  // App Router: utilisation sans contexte spécifique
  return getServerSession(authOptions);
};
