import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
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
 * Vérifier si un utilisateur a les permissions requises
 */
export async function checkUserPermissions(
  userId: string,
  requiredRole?: string,
  requiredPermissions?: string[],
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      admin: true,
    },
  });

  if (!user) {
    return false;
  }

  // Vérifier le rôle
  if (requiredRole && user.role !== requiredRole) {
    return false;
  }

  // Les admins ont toutes les permissions
  if (user.role === "ADMIN") {
    return true;
  }

  // Vérifier les permissions spécifiques
  if (requiredPermissions && user.admin) {
    const userPermissions = user.admin.permissions || [];
    return requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );
  }

  return true;
}

/**
 * Wrapper pour vérifier l'authentification et permissions dans les API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (user: any) => Promise<NextResponse>,
  options?: {
    requiredRole?: string;
    requiredPermissions?: string[];
  },
) {
  const user = await getCurrentUserAPI(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier les permissions
  if (options?.requiredRole || options?.requiredPermissions) {
    const hasPermission = await checkUserPermissions(
      user.id,
      options.requiredRole,
      options.requiredPermissions,
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return handler(user);
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
 * Récupère l'utilisateur courant pour les API routes
 * - Version corrigée pour NextAuth v5 avec tokens chiffrés
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

    // 2. Pour les API routes, utiliser directement auth() de NextAuth
    // NextAuth v5 peut gérer la récupération de session même dans les API routes
    let session = null;
    
    try {
      console.log('🔍 [AUTH] Tentative de récupération session avec auth()');
      // Utiliser auth() pour récupérer la session
      session = await auth();
      console.log('🔍 [AUTH] Session récupérée:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userRole: session?.user?.role
      });
    } catch (authError) {
      // Si auth() échoue dans l'API route, essayer une approche alternative
      console.log("❌ [AUTH] Auth failed in API route, trying session check:", authError);
      
      // Vérifier si on a les cookies nécessaires
      const cookie = request.headers.get("cookie");
      console.log('🔍 [AUTH] Cookie check:', {
        hasCookie: !!cookie,
        hasSessionToken: cookie?.includes("authjs.session-token=")
      });
      
      if (!cookie || !cookie.includes("authjs.session-token=")) {
        return null;
      }
      
      // Si on a le cookie mais auth() échoue, il y a probablement un problème de contexte
      return null;
    }

    if (!session?.user?.id) {
      console.log('❌ [AUTH] Pas de session ou pas d\'ID utilisateur');
      return null;
    }

    // 3. Récupérer l'utilisateur complet depuis la base de données
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
 * Fonction requireRole - Vérification de l'authentification et du rôle
 * Compatible avec les API routes existantes
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const user = await getCurrentUserAPI(request);
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  
  return user;
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
