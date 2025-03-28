import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour créer un service
const createServiceSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  categoryId: z.string().uuid(),
  price: z.number().min(0).refine(
    (n) => Number(n.toFixed(2)) === n,
    { message: "Price must have at most 2 decimal places" }
  ),
  durationMinutes: z.number().int().min(15),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
  maximumDistance: z.number().min(0).optional(), // En km
  tags: z.array(z.string()).optional(),
  requiresVerification: z.boolean().default(false),
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isActive: z.enum(["true", "false", "all"]).default("true"),
  sortBy: z.enum(["createdAt", "price", "name", "popularity"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authentification facultative pour cette route
    const session = await getServerSession(authOptions);

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
      categoryId,
      minPrice,
      maxPrice,
      isActive,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Construction des conditions de filtrage
    const whereClause: Prisma.ServiceWhereInput = {};

    // Filtre par recherche
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } }
      ];
    }

    // Filtre par catégorie
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Filtre par prix
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      
      if (minPrice !== undefined) {
        whereClause.price.gte = minPrice;
      }
      
      if (maxPrice !== undefined) {
        whereClause.price.lte = maxPrice;
      }
    }

    // Filtre par statut actif
    if (isActive !== "all") {
      whereClause.isActive = isActive === "true";
    }

    // Détermination du tri
    let orderBy: Prisma.ServiceOrderByWithRelationInput;
    
    if (sortBy === "popularity") {
      orderBy = {
        bookings: {
          _count: sortOrder
        }
      };
    } else {
      orderBy = {
        [sortBy]: sortOrder
      };
    }

    // Comptage total des services correspondants pour la pagination
    const totalCount = await prisma.service.count({
      where: whereClause
    });

    // Récupération des services
    const services = await prisma.service.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        },
        _count: {
          select: {
            bookings: true
          }
        }
      }
    });

    // Retourner la liste avec les métadonnées de pagination
    return NextResponse.json({
      success: true,
      data: {
        services,
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
    console.error("Erreur lors de la récupération des services:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les services"
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
          message: "Vous devez être connecté pour créer un service"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!userFromDb || userFromDb.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des services"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = createServiceSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de service invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const {
      name,
      description,
      categoryId,
      price,
      durationMinutes,
      isActive,
      imageUrl,
      availableDays,
      maximumDistance,
      tags,
      requiresVerification
    } = validatedBody.data;

    // Vérifier si la catégorie existe
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "La catégorie sélectionnée n'existe pas"
        }
      }, { status: 404 });
    }

    // Créer le service
    const service = await prisma.service.create({
      data: {
        name,
        description,
        categoryId,
        price,
        durationMinutes,
        isActive,
        imageUrl,
        availableDays,
        maximumDistance,
        tags,
        requiresVerification,
        createdById: session.user.id
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        }
      }
    });

    // Créer un journal d'audit
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "SERVICE",
        entityId: service.id,
        userId: session.user.id,
        details: JSON.stringify({
          name,
          categoryId,
          price
        })
      }
    });

    return NextResponse.json({
      success: true,
      data: service
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du service:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer le service"
      }
    }, { status: 500 });
  }
} 