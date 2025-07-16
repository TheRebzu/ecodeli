import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

/**
 * Utilitaires d'authentification compatibles EcoDeli + NextAuth
 */

/**
 * Récupérer l'utilisateur depuis la session - API Routes NextAuth
 */
export async function getUserFromSession(request: NextRequest) {
  return getCurrentUserAPI(request);
}

/**
 * Récupérer session côté serveur (RSC/Server Actions)
 */
export async function getServerSession() {
  try {
    const session = await auth();
    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Récupérer l'utilisateur complet côté serveur
 */
export async function getServerUser() {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return null;
    }

    const includeRelations: any = {
      profile: true,
    };

    // Inclure la relation spécifique selon le rôle
    switch (session.user.role) {
      case "CLIENT":
        includeRelations.client = true;
        break;
      case "DELIVERER":
        includeRelations.deliverer = true;
        break;
      case "MERCHANT":
        includeRelations.merchant = true;
        break;
      case "PROVIDER":
        includeRelations.provider = true;
        break;
      case "ADMIN":
        includeRelations.admin = true;
        break;
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: includeRelations,
    });

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Vérifier les permissions selon le rôle
 */
export function hasPermission(
  userRole: string,
  requiredRoles: string[],
): boolean {
  if (!userRole || !requiredRoles?.length) {
    return false;
  }

  // ADMIN a accès à tout
  if (userRole === "ADMIN") {
    return true;
  }

  return requiredRoles.includes(userRole);
}

/**
 * Vérifier si l'utilisateur peut accéder à une ressource
 */
export function canAccessResource(
  userRole: string,
  resourceOwner: string,
  userId: string,
): boolean {
  // ADMIN peut accéder à tout
  if (userRole === "ADMIN") {
    return true;
  }

  // Propriétaire de la ressource
  if (resourceOwner === userId) {
    return true;
  }

  return false;
}

/**
 * Middleware de vérification des rôles pour API routes
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[],
) {
  // En mode test, utiliser l'email de test
  if (process.env.NODE_ENV === "development") {
    const testUserEmail = request.headers.get("X-Test-User-Email");

    if (testUserEmail) {
      const testUser = await db.user.findUnique({
        where: { email: testUserEmail },
        include: {
          profile: true,
          client: true,
          deliverer: true,
          merchant: true,
          provider: true,
          admin: true,
        },
      });

      if (testUser) {
        if (!hasPermission(testUser.role, allowedRoles)) {
          throw new Error(
            `Accès refusé - Permissions insuffisantes. Rôle: ${testUser.role}, Requis: ${allowedRoles.join(", ")}`,
          );
        }

        return testUser;
      }
    }
  }

  // Récupérer l'utilisateur via la session NextAuth normale
  const user = await getCurrentUserAPI(request);

  if (!user) {
    // Rediriger vers /fr/login si l'utilisateur n'est pas authentifié
    const url = new URL(request.url);
    const locale = url.pathname.split("/")[1] || "fr";
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (!hasPermission(user.role, allowedRoles)) {
    throw new Error(
      `Accès refusé - Permissions insuffisantes. Rôle: ${user.role}, Requis: ${allowedRoles.join(", ")}`,
    );
  }

  return user;
}

/**
 * Middleware simplifié pour vérifier uniquement l'authentification
 */
export async function requireAuth(request: NextRequest) {
  return await requireRole(request, [
    "CLIENT",
    "DELIVERER",
    "MERCHANT",
    "PROVIDER",
    "ADMIN",
  ]);
}

/**
 * Types pour une meilleure intégration TypeScript
 */
export type UserWithProfile = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  validationStatus: string;
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  } | null;
  client?: any;
  deliverer?: any;
  merchant?: any;
  provider?: any;
  admin?: any;
};

/**
 * Constantes pour les rôles
 */
export const USER_ROLES = {
  ADMIN: "ADMIN",
  CLIENT: "CLIENT",
  DELIVERER: "DELIVERER",
  MERCHANT: "MERCHANT",
  PROVIDER: "PROVIDER",
} as const;

export const VALIDATION_STATUS = {
  PENDING: "PENDING",
  VALIDATED: "VALIDATED",
  REJECTED: "REJECTED",
} as const;

/**
 * Récupère l'utilisateur courant pour API Routes
 * - Utilise NextAuth pour récupérer la session
 * - Supporte les tests avec X-Test-User-Email
 */
export async function getCurrentUserAPI(request: NextRequest) {
  try {
    // En mode test, utiliser l'email de test
    if (process.env.NODE_ENV === "development") {
      const testUserEmail = request.headers.get("X-Test-User-Email");

      if (testUserEmail) {
        const testUser = await db.user.findUnique({
          where: { email: testUserEmail },
          include: {
            profile: true,
            client: true,
            deliverer: true,
            merchant: true,
            provider: true,
            admin: true,
          },
        });

        if (testUser) {
          return testUser;
        }
      }
    }

    // 1. Vérifier l'authentification par Bearer Token (pour l'app mobile)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      // Pour l'instant, utiliser le token mock format: mock_token_{userId}
      if (token.startsWith("mock_token_")) {
        const userId = token.replace("mock_token_", "");
        
        const user = await db.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            client: true,
            deliverer: true,
            merchant: true,
            provider: true,
            admin: true,
          },
        });

        if (user) {
          return user;
        }
      }
    }

    // 2. --- PATCH: Décodage manuel du cookie JWT pour API route ---
    // Si la session n'est pas trouvée via auth(), on décode le cookie JWT pour extraire l'id utilisateur
    let session = await auth();
    let userId: string | null = null;
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const cookie = request.headers.get("cookie");
      if (cookie) {
        const match = cookie.match(/authjs\.session-token=([^;]+)/);
        if (match) {
          const token = match[1];
          // Décodage du JWT (sans vérification de signature)
          const decoded: any = jwt.decode(token);
          userId = decoded?.sub || null;
        }
      }
    }

    if (!userId) {
      return null;
    }

    const includeRelations: any = {
      profile: true,
      client: true,
      deliverer: true,
      merchant: true,
      provider: true,
      admin: true,
    };

    const user = await db.user.findUnique({
      where: { id: userId },
      include: includeRelations,
    });

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Récupère l'utilisateur courant pour RSC/Server Actions
 * - Utilise NextAuth pour récupérer la session
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // Récupérer l'utilisateur avec son profil
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        provider: true,
        deliverer: true,
        merchant: true,
        client: true,
      },
    });

    if (!user) {
      return null;
    }

    // Vérifier et réparer automatiquement si l'utilisateur n'a pas de profil
    if (!user.profile) {
      const profile = await prisma.profile.create({
        data: {
          userId: user.id,
          firstName: user.email.split("@")[0], // Utiliser la partie avant @ comme prénom par défaut
          lastName: "Utilisateur",
          phone: "0000000000",
          address: "Adresse non spécifiée",
          city: "Ville non spécifiée",
          postalCode: "00000",
          country: "France",
          isVerified: false,
        },
      });
      // Recharger l'utilisateur avec le nouveau profil
      return await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          profile: true,
          provider: true,
          deliverer: true,
          merchant: true,
          client: true,
        },
      });
    }

    return user;
  } catch (error) {
    return null;
  }
}
