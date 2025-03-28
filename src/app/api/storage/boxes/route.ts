import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BoxSize, BoxStatus, Prisma, UserRole } from "@prisma/client";

// Schéma pour réserver une box
const reserveBoxSchema = z.object({
  size: z.nativeEnum(BoxSize),
  startDate: z.string().datetime(), // Format ISO
  endDate: z.string().datetime(), // Format ISO
  locationId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  specialRequirements: z.string().max(500).optional(),
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  size: z.nativeEnum(BoxSize).optional(),
  status: z.nativeEnum(BoxStatus).optional(),
  locationId: z.string().uuid().optional(),
  availableOn: z.string().datetime().optional(), // Format ISO
  sortBy: z.enum(["createdAt", "updatedAt", "size"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
          message: "Vous devez être connecté pour consulter les box de stockage"
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
      size,
      status,
      locationId,
      availableOn,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Construction des conditions de filtrage
    const whereClause: Prisma.StorageBoxWhereInput = {};

    // Filtre par taille
    if (size) {
      whereClause.size = size;
    }

    // Filtre par statut
    if (status) {
      whereClause.status = status;
    }

    // Filtre par emplacement
    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Filtre par disponibilité à une date donnée
    if (availableOn) {
      const checkDate = new Date(availableOn);
      whereClause.OR = [
        {
          // Box disponibles
          status: BoxStatus.AVAILABLE
        },
        {
          // Box réservées mais pas à cette date
          status: BoxStatus.RESERVED,
          reservations: {
            every: {
              OR: [
                {
                  endDate: { lt: checkDate } // Réservations terminées avant la date
                },
                {
                  startDate: { gt: checkDate } // Réservations commençant après la date
                }
              ]
            }
          }
        }
      ];
    }

    // Récupérer le rôle de l'utilisateur pour filtrer les résultats
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

    // Détermination du tri
    const orderBy: Prisma.StorageBoxOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    // Comptage total des box correspondantes pour la pagination
    const totalCount = await prisma.storageBox.count({
      where: whereClause
    });

    // Récupération des box
    const boxes = await prisma.storageBox.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            openingHours: true
          }
        },
        currentReservation: userFromDb.role === UserRole.ADMIN ? {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        } : undefined,
        _count: {
          select: {
            reservations: true
          }
        }
      }
    });

    // Retourner la liste avec les métadonnées de pagination
    return NextResponse.json({
      success: true,
      data: {
        boxes,
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
    console.error("Erreur lors de la récupération des box:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les box de stockage"
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
          message: "Vous devez être connecté pour réserver une box de stockage"
        }
      }, { status: 401 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = reserveBoxSchema.safeParse(body);

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
      size,
      startDate,
      endDate,
      locationId,
      notes,
      specialRequirements
    } = validatedBody.data;

    // Convertir les dates en objets Date
    const reservationStartDate = new Date(startDate);
    const reservationEndDate = new Date(endDate);

    // Valider que la date de début est avant la date de fin
    if (reservationStartDate >= reservationEndDate) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATE_RANGE",
          message: "La date de début doit être antérieure à la date de fin"
        }
      }, { status: 400 });
    }

    // Valider que la date de début est dans le futur
    if (reservationStartDate < new Date()) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_START_DATE",
          message: "La date de début doit être dans le futur"
        }
      }, { status: 400 });
    }

    // Vérifier que l'emplacement existe
    const location = await prisma.storageLocation.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return NextResponse.json({
        success: false,
        error: {
          code: "LOCATION_NOT_FOUND",
          message: "L'emplacement sélectionné n'existe pas"
        }
      }, { status: 404 });
    }

    // Trouver une box disponible correspondant aux critères
    const availableBox = await prisma.storageBox.findFirst({
      where: {
        size,
        locationId,
        OR: [
          {
            status: BoxStatus.AVAILABLE
          },
          {
            status: BoxStatus.RESERVED,
            reservations: {
              every: {
                OR: [
                  {
                    endDate: { lt: reservationStartDate }
                  },
                  {
                    startDate: { gt: reservationEndDate }
                  }
                ]
              }
            }
          }
        ]
      }
    });

    if (!availableBox) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NO_BOX_AVAILABLE",
          message: `Aucune box ${size} disponible à cet emplacement pour les dates sélectionnées`
        }
      }, { status: 400 });
    }

    // Calculer le prix en fonction de la taille et de la durée
    // Exemple simple: prix = prix journalier * nombre de jours
    const durationDays = Math.max(1, Math.ceil((reservationEndDate.getTime() - reservationStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    let baseDailyPrice;
    switch (size) {
      case BoxSize.SMALL: baseDailyPrice = 5; break;
      case BoxSize.MEDIUM: baseDailyPrice = 10; break;
      case BoxSize.LARGE: baseDailyPrice = 15; break;
      case BoxSize.EXTRA_LARGE: baseDailyPrice = 25; break;
      default: baseDailyPrice = 10;
    }
    
    const totalPrice = baseDailyPrice * durationDays;

    // Créer la réservation avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le statut de la box
      const updatedBox = await tx.storageBox.update({
        where: { id: availableBox.id },
        data: {
          status: BoxStatus.RESERVED,
          lastReservationId: null // Sera mis à jour après la création de la réservation
        }
      });

      // Créer la réservation
      const reservation = await tx.boxReservation.create({
        data: {
          boxId: updatedBox.id,
          userId: session.user.id,
          startDate: reservationStartDate,
          endDate: reservationEndDate,
          status: "CONFIRMED",
          totalPrice,
          notes,
          specialRequirements
        }
      });

      // Mettre à jour la box avec l'ID de la réservation actuelle
      await tx.storageBox.update({
        where: { id: updatedBox.id },
        data: {
          lastReservationId: reservation.id
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
          title: "Nouvelle réservation de box",
          message: `Nouvelle réservation d'une box ${size} du ${reservationStartDate.toLocaleDateString()} au ${reservationEndDate.toLocaleDateString()}`,
          type: "BOX_RESERVATION",
          referenceId: reservation.id
        }))
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "BOX_RESERVATION",
          entityId: reservation.id,
          userId: session.user.id,
          details: JSON.stringify({
            boxId: updatedBox.id,
            size,
            startDate: reservationStartDate,
            endDate: reservationEndDate,
            totalPrice
          })
        }
      });

      return {
        box: updatedBox,
        reservation
      };
    });

    // Récupérer les détails complets de la réservation
    const reservationDetails = await prisma.boxReservation.findUnique({
      where: { id: result.reservation.id },
      include: {
        box: {
          include: {
            location: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: reservationDetails
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la réservation de la box:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de réserver la box de stockage"
      }
    }, { status: 500 });
  }
} 