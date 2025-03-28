import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour créer un emplacement
const createLocationSchema = z.object({
  name: z.string().min(3).max(100),
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  description: z.string().max(1000).optional(),
  openingHours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      isClosed: z.boolean().default(false)
    })
  ).optional(),
  isActive: z.boolean().default(true)
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).default("all"),
  city: z.string().optional(),
  sortBy: z.enum(["name", "city", "boxCount", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export async function GET(req: NextRequest) {
  try {
    // Analyse des paramètres de requête
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Paramètres de requête invalides",
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const {
      page,
      limit,
      search,
      isActive,
      city,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Construction des conditions de filtrage
    const whereClause: Prisma.StorageLocationWhereInput = {};

    // Filtre par statut actif
    if (isActive !== "all") {
      whereClause.isActive = isActive === "true";
    }

    // Filtre par ville
    if (city) {
      whereClause.city = {
        contains: city,
        mode: "insensitive" as Prisma.QueryMode
      };
    }

    // Recherche
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { address: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { city: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { postalCode: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
        { country: { contains: search, mode: "insensitive" as Prisma.QueryMode } }
      ];
    }

    // Détermination du tri
    const orderBy: { [key: string]: string } = {};
    if (sortBy === "boxCount") {
      // Cas spécial pour trier par nombre de box
      orderBy.name = sortOrder; // Tri par défaut, sera ignoré dans la requête finale
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Comptage total des emplacements pour la pagination
    const totalCount = await prisma.storageLocation.count({
      where: whereClause
    });

    // Récupération des emplacements
    const locations = await prisma.storageLocation.findMany({
      where: whereClause,
      orderBy: sortBy !== "boxCount" ? orderBy : undefined,
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            boxes: true
          }
        }
      }
    });

    // Trier par nombre de box si nécessaire (tri côté client car non supporté directement par Prisma)
    let sortedLocations = locations;
    if (sortBy === "boxCount") {
      sortedLocations = [...locations].sort((a, b) => {
        return sortOrder === "asc"
          ? a._count.boxes - b._count.boxes
          : b._count.boxes - a._count.boxes;
      });
    }

    // Retourner la liste avec les métadonnées de pagination
    return NextResponse.json({
      success: true,
      data: {
        locations: sortedLocations,
        meta: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des emplacements:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les emplacements de stockage"
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour créer un emplacement de stockage"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des emplacements de stockage"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = createLocationSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données d'emplacement invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const locationData = validatedBody.data;

    // Vérifier si un emplacement avec le même nom existe déjà
    const existingLocation = await prisma.storageLocation.findFirst({
      where: {
        name: locationData.name
      }
    });

    if (existingLocation) {
      return NextResponse.json({
        success: false,
        error: {
          code: "LOCATION_EXISTS",
          message: "Un emplacement avec ce nom existe déjà"
        }
      }, { status: 400 });
    }

    // Créer l'emplacement et l'audit log dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'emplacement
      const location = await tx.storageLocation.create({
        data: locationData
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "STORAGE_LOCATION",
          entityId: location.id,
          userId: session.user.id,
          details: JSON.stringify({
            name: location.name,
            address: location.address,
            city: location.city
          })
        }
      });

      return location;
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'emplacement:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer l'emplacement de stockage"
      }
    }, { status: 500 });
  }
} 