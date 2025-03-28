import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma, UserRole } from "@prisma/client";

// Schéma pour créer/mettre à jour une disponibilité
const upsertAvailabilitySchema = z.object({
  date: z.string().datetime(), // Format ISO
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // Format HH:MM
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // Format HH:MM
  maxDeliveries: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  recurrent: z.boolean().default(false),
  weekDay: z.number().int().min(0).max(6).optional(), // 0 = Dimanche, 6 = Samedi
  areas: z.array(z.string()).optional(), // Codes postaux ou identifiants de zones
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  startDate: z.string().datetime().optional(), // Format ISO
  endDate: z.string().datetime().optional(), // Format ISO
  delivererId: z.string().uuid().optional(),
  sortBy: z.enum(["date", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour consulter les disponibilités"
        }
      }, { status: 401 });
    }

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
      startDate,
      endDate,
      delivererId,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Récupérer le rôle de l'utilisateur pour les permissions
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!userFromDb) {
      return NextResponse.json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "Utilisateur non trouvé"
        }
      }, { status: 404 });
    }

    // Construction des conditions de filtrage
    const whereClause: Prisma.DeliveryAvailabilityWhereInput = {};

    // Les livreurs ne peuvent voir que leurs propres disponibilités
    if (userFromDb.role !== UserRole.ADMIN) {
      if (userFromDb.role !== UserRole.DELIVERY_AGENT) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'avez pas l'autorisation de consulter les disponibilités des livreurs"
          }
        }, { status: 403 });
      }
      
      whereClause.userId = userFromDb.id;
    } else if (delivererId) {
      // Si un administrateur spécifie un livreur
      whereClause.userId = delivererId;
    }

    // Filtre par date
    if (startDate || endDate) {
      whereClause.date = {};
      
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    // Détermination du tri
    const orderBy: Prisma.DeliveryAvailabilityOrderByWithRelationInput = {};
    if (sortBy === "date") {
      orderBy.date = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Comptage total des disponibilités correspondantes pour la pagination
    const totalCount = await prisma.deliveryAvailability.count({
      where: whereClause
    });

    // Récupération des disponibilités
    const availabilities = await prisma.deliveryAvailability.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    });

    // Retourner la liste avec les métadonnées de pagination
    return NextResponse.json({
      success: true,
      data: {
        availabilities,
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
    console.error("Erreur lors de la récupération des disponibilités:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les disponibilités"
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
          message: "Vous devez être connecté pour définir une disponibilité"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur ou un administrateur
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!userFromDb) {
      return NextResponse.json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "Utilisateur non trouvé"
        }
      }, { status: 404 });
    }

    if (userFromDb.role !== UserRole.DELIVERY_AGENT && userFromDb.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les livreurs et les administrateurs peuvent définir des disponibilités"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = upsertAvailabilitySchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de disponibilité invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const {
      date,
      startTime,
      endTime,
      maxDeliveries,
      notes,
      recurrent,
      weekDay,
      areas
    } = validatedBody.data;

    // Valider que l'heure de début est avant l'heure de fin
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_TIME_RANGE",
          message: "L'heure de début doit être antérieure à l'heure de fin"
        }
      }, { status: 400 });
    }

    // Convertir la date en objet Date
    const availabilityDate = new Date(date);
    
    // Si récurrent, weekDay est obligatoire
    if (recurrent && weekDay === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          code: "MISSING_WEEKDAY",
          message: "Le jour de la semaine est requis pour une disponibilité récurrente"
        }
      }, { status: 400 });
    }

    // Créer la disponibilité
    const availability = await prisma.deliveryAvailability.create({
      data: {
        userId: session.user.id,
        date: availabilityDate,
        startTime,
        endTime,
        maxDeliveries,
        notes,
        recurrent,
        weekDay,
        areas
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Créer un journal d'audit
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "DELIVERY_AVAILABILITY",
        entityId: availability.id,
        userId: session.user.id,
        details: JSON.stringify({
          date: availabilityDate,
          startTime,
          endTime,
          recurrent
        })
      }
    });

    return NextResponse.json({
      success: true,
      data: availability
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la disponibilité:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer la disponibilité"
      }
    }, { status: 500 });
  }
} 