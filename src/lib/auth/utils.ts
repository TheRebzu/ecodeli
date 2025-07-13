import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

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
      console.log(
        "🧪 Mode test détecté, utilisation de l'email:",
        testUserEmail,
      );

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

        console.log(
          "✅ Utilisateur test authentifié:",
          testUser.email,
          testUser.role,
        );
        return testUser;
      }
    }
  }

  // Récupérer l'utilisateur via la session NextAuth normale
  const user = await getCurrentUserAPI(request);

  if (!user) {
    throw new Error("Accès refusé - Authentification requise");
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
        console.log(
          "🧪 Mode test détecté dans getCurrentUserAPI, utilisation de l'email:",
          testUserEmail,
        );

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
          console.log(
            "✅ Utilisateur test trouvé dans getCurrentUserAPI:",
            testUser.email,
            testUser.role,
          );
          return testUser;
        }
      }
    }

    // Utiliser NextAuth pour obtenir la session normale
    const session = await auth();

    if (!session?.user) {
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
      where: { id: session.user.id },
      include: includeRelations,
    });

    return user;
  } catch (error) {
    console.error("Error in getCurrentUserAPI:", error);
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
      console.log(
        `🔧 Réparation automatique du profil pour l'utilisateur ${user.email} (${user.id})`,
      );

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

      console.log(`✅ Profil créé pour ${user.email}: ${profile.id}`);

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
    console.error(
      "Erreur lors de la récupération/réparation de l'utilisateur:",
      error,
    );
    return null;
  }
}
