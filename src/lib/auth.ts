import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Informations d'identification incomplètes");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            customerProfile: Boolean(credentials.role === "CUSTOMER"),
            courierProfile: Boolean(credentials.role === "COURIER"),
            merchantProfile: Boolean(credentials.role === "MERCHANT"),
            providerProfile: Boolean(credentials.role === "PROVIDER"),
          },
        });

        if (!user || !user.password) {
          throw new Error("Aucun utilisateur trouvé avec cet email");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("Votre compte n'est pas actif. Veuillez vérifier votre email ou contacter le support.");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Mot de passe incorrect");
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          image: null,
          profileId: getProfileId(user),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.profileId = user.profileId;
      }

      if (account?.provider === "credentials") {
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.profileId = token.profileId as string;
      }

      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Fonction utilitaire pour récupérer l'ID de profil en fonction du rôle
function getProfileId(user: any): string | null {
  switch (user.role) {
    case "CUSTOMER":
      return user.customerProfile?.id || null;
    case "COURIER":
      return user.courierProfile?.id || null;
    case "MERCHANT":
      return user.merchantProfile?.id || null;
    case "PROVIDER":
      return user.providerProfile?.id || null;
    default:
      return null;
  }
}