import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BookingStatus, Prisma, UserRole } from "@prisma/client";

// Schéma pour créer une réservation
const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  scheduledDate: z.string().datetime(), // Format ISO
  notes: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  contactPhone: z.string().optional(),
  specialRequirements: z.string().max(500).optional(),
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(BookingStatus).optional(),
  serviceId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
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
          message: "Vous devez être connecté pour voir les réservations"
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
      status,
      serviceId,
      fromDate,
      toDate,
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
    const whereClause: Prisma.BookingWhereInput = {};

    // Les utilisateurs normaux ne peuvent voir que leurs propres réservations
    if (userFromDb.role !== UserRole.ADMIN) {
      whereClause.userId = userFromDb.id;
    }

    // Filtre par statut
    if (status) {
      whereClause.status = status;
    }

    // Filtre par service
    if (serviceId) {
      whereClause.serviceId = serviceId;
    }

    // Filtre par date programmée
    if (fromDate || toDate) {
      whereClause.scheduledDate = {};
      
      if (fromDate) {
        whereClause.scheduledDate.gte = new Date(fromDate);
      }
      
      if (toDate) {
        whereClause.scheduledDate.lte = new Date(toDate);
      }
    }

    // Détermination du tri
    const orderBy: Prisma.BookingOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Comptage total des réservations correspondantes pour la pagination
    const totalCount = await prisma.booking.count({
      where: whereClause
    });

    // Récupération des réservations
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
              }
            }
          }
        },
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
        bookings,
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
    console.error("Erreur lors de la récupération des réservations:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les réservations"
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
          message: "Vous devez être connecté pour effectuer une réservation"
        }
      }, { status: 401 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = createBookingSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de réservation invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const {
      serviceId,
      scheduledDate,
      notes,
      address,
      contactPhone,
      specialRequirements
    } = validatedBody.data;

    // Vérifier si le service existe et est actif
    const service = await prisma.service.findUnique({
      where: { 
        id: serviceId,
        isActive: true
      }
    });

    if (!service) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SERVICE_NOT_FOUND",
          message: "Le service sélectionné n'existe pas ou n'est pas disponible"
        }
      }, { status: 404 });
    }

    // Vérifier que la date de programmation est dans le futur
    const bookingDate = new Date(scheduledDate);
    if (bookingDate < new Date()) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATE",
          message: "La date de réservation doit être dans le futur"
        }
      }, { status: 400 });
    }

    // Vérifier la disponibilité du créneau
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        serviceId,
        scheduledDate: {
          gte: new Date(bookingDate.getTime() - 30 * 60000), // 30 minutes avant
          lte: new Date(bookingDate.getTime() + service.durationMinutes * 60000), // Durée du service après
        },
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        }
      }
    });

    if (conflictingBooking) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SLOT_UNAVAILABLE",
          message: "Ce créneau horaire n'est pas disponible"
        }
      }, { status: 409 });
    }

    // Créer la réservation avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer la réservation
      const booking = await tx.booking.create({
        data: {
          serviceId,
          userId: session.user.id,
          scheduledDate: bookingDate,
          status: BookingStatus.PENDING,
          price: service.price, // Capturer le prix actuel du service
          notes,
          address,
          contactPhone,
          specialRequirements
        }
      });

      // Créer une notification pour l'administrateur
      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true }
      });

      await tx.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: "Nouvelle réservation de service",
          message: `Nouvelle réservation du service: ${service.name}`,
          type: "BOOKING",
          referenceId: booking.id
        }))
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "BOOKING",
          entityId: booking.id,
          userId: session.user.id,
          details: JSON.stringify({
            serviceId,
            scheduledDate: bookingDate,
            price: service.price
          })
        }
      });

      return booking;
    });

    // Récupérer la réservation complète avec les données associées
    const createdBooking = await prisma.booking.findUnique({
      where: { id: result.id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: createdBooking
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la réservation:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer la réservation"
      }
    }, { status: 500 });
  }
} 