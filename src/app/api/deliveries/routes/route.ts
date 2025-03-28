import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { DeliveryStatus, Prisma, UserRole } from "@prisma/client";

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  date: z.string().datetime().optional(), // Format ISO
  delivererId: z.string().uuid().optional(),
  status: z.nativeEnum(DeliveryStatus).optional(),
  area: z.string().optional(), // Code postal ou zone
  sortBy: z.enum(["scheduledDate", "createdAt", "status"]).default("scheduledDate"),
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
          message: "Vous devez être connecté pour consulter les trajets"
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
      date,
      delivererId,
      status,
      area,
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
    const whereClause: Prisma.DeliveryRouteWhereInput = {};

    // Les livreurs ne peuvent voir que leurs propres trajets
    if (userFromDb.role !== UserRole.ADMIN) {
      if (userFromDb.role !== UserRole.DELIVERY_AGENT) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'avez pas l'autorisation de consulter les trajets des livreurs"
          }
        }, { status: 403 });
      }
      
      whereClause.deliveryAgentId = userFromDb.id;
    } else if (delivererId) {
      // Si un administrateur spécifie un livreur
      whereClause.deliveryAgentId = delivererId;
    }

    // Filtre par date
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      whereClause.scheduledDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    // Filtre par statut
    if (status) {
      whereClause.status = status;
    }

    // Filtre par zone/code postal
    if (area) {
      whereClause.stops = {
        some: {
          address: {
            contains: area
          }
        }
      };
    }

    // Détermination du tri
    const orderBy: Prisma.DeliveryRouteOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Comptage total des trajets correspondants pour la pagination
    const totalCount = await prisma.deliveryRoute.count({
      where: whereClause
    });

    // Récupération des trajets
    const routes = await prisma.deliveryRoute.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        deliveryAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true
          }
        },
        stops: {
          orderBy: {
            orderIndex: "asc"
          },
          select: {
            id: true,
            orderIndex: true,
            address: true,
            scheduledTime: true,
            status: true,
            notes: true,
            delivery: {
              select: {
                id: true,
                trackingNumber: true,
                recipient: true,
                recipientPhone: true
              }
            }
          }
        },
        _count: {
          select: {
            stops: true
          }
        }
      }
    });

    // Calcul des statistiques pour chaque trajet
    const routesWithStats = routes.map(route => {
      const completedStops = route.stops.filter(stop => stop.status === 'DELIVERED').length;
      const pendingStops = route.stops.filter(stop => stop.status === 'PENDING').length;
      const failedStops = route.stops.filter(stop => stop.status === 'FAILED').length;
      
      return {
        ...route,
        stats: {
          totalStops: route._count.stops,
          completedStops,
          pendingStops,
          failedStops,
          completionPercentage: route._count.stops > 0 
            ? Math.round((completedStops / route._count.stops) * 100) 
            : 0
        }
      };
    });

    // Retourner la liste avec les métadonnées de pagination
    return NextResponse.json({
      success: true,
      data: {
        routes: routesWithStats,
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
    console.error("Erreur lors de la récupération des trajets:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les trajets"
      }
    }, { status: 500 });
  }
} 