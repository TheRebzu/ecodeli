import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour créer un service à la personne
const createPersonalServiceSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  price: z.number().min(0),
  durationMinutes: z.number().int().min(15),
  categoryId: z.string().uuid(),
  availability: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  })).optional(),
  serviceAreaIds: z.array(z.string().uuid()).optional(),
  requiresLicense: z.boolean().default(false),
  licenseType: z.string().optional(),
  maxParticipants: z.number().int().min(1).optional(),
  canBeRecurring: z.boolean().default(false),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  additionalDetails: z.record(z.string()).optional()
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isActive: z.enum(["true", "false", "all"]).default("true"),
  sortBy: z.enum(["createdAt", "price", "title", "popularity"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  serviceArea: z.string().uuid().optional(),
  licenseType: z.string().optional(),
  canBeRecurring: z.enum(["true", "false"]).optional(),
  requiresLicense: z.enum(["true", "false"]).optional(),
  providerId: z.string().uuid().optional()
});

export async function GET(req: NextRequest) {
  try {
    // Session facultative pour cette route
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
      page, limit, search, categoryId, minPrice, maxPrice, 
      isActive, sortBy, sortOrder, serviceArea, 
      licenseType, canBeRecurring, requiresLicense, providerId 
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Construction des conditions de filtrage
    const whereClause = {};

    // Filtre par recherche textuelle
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
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

    // Filtre par zone de service
    if (serviceArea) {
      whereClause.serviceAreas = {
        some: { id: serviceArea }
      };
    }

    // Filtre par type de licence
    if (licenseType) {
      whereClause.licenseType = licenseType;
    }

    // Filtre par possibilité de récurrence
    if (canBeRecurring) {
      whereClause.canBeRecurring = canBeRecurring === "true";
    }

    // Filtre par nécessité de licence
    if (requiresLicense) {
      whereClause.requiresLicense = requiresLicense === "true";
    }

    // Filtre par prestataire
    if (providerId) {
      whereClause.providerId = providerId;
    }

    // Détermination du tri
    let orderBy = {};
    
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
    const totalCount = await prisma.personalService.count({
      where: whereClause
    });

    // Récupération des services
    const services = await prisma.personalService.findMany({
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
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            rating: true
          }
        },
        serviceAreas: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            bookings: true,
            reviews: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        services,
        pagination: {
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
        message: "Impossible de récupérer les services à la personne"
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
          message: "Vous devez être connecté pour créer un service à la personne"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un prestataire de services ou un admin
    const isServiceProvider = session.user.role === UserRole.SERVICE_PROVIDER;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isServiceProvider && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les prestataires de services ou les administrateurs peuvent créer des services"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedData = createPersonalServiceSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données du service invalides",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const serviceData = validatedData.data;
    const { 
      title, description, price, durationMinutes, categoryId,
      availability, serviceAreaIds, requiresLicense, licenseType,
      maxParticipants, canBeRecurring, imageUrl, isActive, tags,
      additionalDetails
    } = serviceData;

    // Vérifier que la catégorie existe
    const category = await prisma.personalServiceCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "La catégorie spécifiée n'existe pas"
        }
      }, { status: 404 });
    }

    // Vérifier que les zones de service existent
    if (serviceAreaIds && serviceAreaIds.length > 0) {
      const serviceAreasCount = await prisma.serviceArea.count({
        where: {
          id: {
            in: serviceAreaIds
          }
        }
      });

      if (serviceAreasCount !== serviceAreaIds.length) {
        return NextResponse.json({
          success: false,
          error: {
            code: "SERVICE_AREAS_NOT_FOUND",
            message: "Une ou plusieurs zones de service spécifiées n'existent pas"
          }
        }, { status: 404 });
      }
    }

    // Créer le service à la personne avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer le service
      const service = await tx.personalService.create({
        data: {
          title,
          description,
          price,
          durationMinutes,
          categoryId,
          providerId: session.user.id,
          requiresLicense,
          licenseType,
          maxParticipants,
          canBeRecurring,
          imageUrl,
          isActive,
          tags,
          additionalDetails
        }
      });

      // Associer les zones de service si spécifiées
      if (serviceAreaIds && serviceAreaIds.length > 0) {
        await tx.personalService.update({
          where: { id: service.id },
          data: {
            serviceAreas: {
              connect: serviceAreaIds.map(id => ({ id }))
            }
          }
        });
      }

      // Créer les disponibilités si spécifiées
      if (availability && availability.length > 0) {
        await tx.personalServiceAvailability.createMany({
          data: availability.map(slot => ({
            personalServiceId: service.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime
          }))
        });
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "PERSONAL_SERVICE",
          entityId: service.id,
          userId: session.user.id,
          details: JSON.stringify({
            title,
            categoryId,
            price
          })
        }
      });

      // Notifier les administrateurs de la création d'un nouveau service
      if (!isAdmin) {
        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true }
        });

        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: "Nouveau service à la personne",
            message: `Un nouveau service "${title}" a été créé par ${session.user.name || session.user.email}`,
            type: "SERVICE_CREATED",
            referenceId: service.id
          }))
        });
      }

      return service;
    });

    // Récupérer le service créé avec ses relations
    const createdService = await prisma.personalService.findUnique({
      where: { id: result.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        },
        provider: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        serviceAreas: {
          select: {
            id: true,
            name: true
          }
        },
        availability: true
      }
    });

    return NextResponse.json({
      success: true,
      data: createdService
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du service:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer le service à la personne"
      }
    }, { status: 500 });
  }
} 