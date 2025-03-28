import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour créer une disponibilité
const createAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Format YYYY-MM-DD
  timeSlots: z.array(z.object({
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // Format HH:MM
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // Format HH:MM
  })).min(1),
  recurrent: z.boolean().default(false),
  recurrencePattern: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workType: z.enum(["DELIVERY", "SERVICE", "BOTH"]),
  maxCapacity: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
  serviceAreaIds: z.array(z.string().uuid()).optional(),
  excludeDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

// Schéma pour les paramètres de requête
const queryParamsSchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
  userId: z.string().uuid().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workType: z.enum(["DELIVERY", "SERVICE", "BOTH", "ALL"]).default("ALL"),
  serviceAreaId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "PAST", "ALL"]).default("ACTIVE"),
  sortBy: z.enum(["date", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  showRecurrentOnly: z.enum(["true", "false"]).default("false"),
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
          message: "Vous devez être connecté pour accéder aux plannings"
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
      page, limit, userId, fromDate, toDate, workType, 
      serviceAreaId, status, sortBy, sortOrder, showRecurrentOnly 
    } = validatedQuery.data;

    // Calcul des valeurs de pagination
    const skip = (page - 1) * limit;

    // Vérifier les permissions
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isDeliveryPerson = session.user.role === UserRole.DELIVERY_PERSON;
    const isServiceProvider = session.user.role === UserRole.SERVICE_PROVIDER;
    const isProvider = isDeliveryPerson || isServiceProvider;

    // Construction des conditions de filtrage
    const whereClause = {};

    // Les utilisateurs normaux ne peuvent voir que leurs propres disponibilités
    if (!isAdmin) {
      whereClause.userId = session.user.id;
    } else if (userId) {
      // Les admins peuvent filtrer par utilisateur
      whereClause.userId = userId;
    }

    // Filtre par type de travail
    if (workType !== "ALL") {
      whereClause.workType = workType;
    }

    // Filtre par date
    if (status === "ACTIVE") {
      whereClause.date = {
        gte: new Date(fromDate || new Date().toISOString().split('T')[0])
      };
    } else if (status === "PAST") {
      whereClause.date = {
        lt: new Date(new Date().toISOString().split('T')[0])
      };
    }
    
    if (fromDate) {
      whereClause.date = {
        ...whereClause.date,
        gte: new Date(fromDate)
      };
    }
    
    if (toDate) {
      whereClause.date = {
        ...whereClause.date,
        lte: new Date(toDate)
      };
    }

    // Filtre par zone de service
    if (serviceAreaId) {
      whereClause.serviceAreas = {
        some: {
          id: serviceAreaId
        }
      };
    }

    // Filtre par récurrence
    if (showRecurrentOnly === "true") {
      whereClause.recurrent = true;
    }

    // Détermination du tri
    const orderBy = {
      [sortBy]: sortOrder
    };

    // Comptage total des disponibilités correspondantes pour la pagination
    const totalCount = await prisma.userAvailability.count({
      where: whereClause
    });

    // Récupération des disponibilités
    const availabilities = await prisma.userAvailability.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        },
        timeSlots: true,
        serviceAreas: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            bookedSlots: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        availabilities,
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
    console.error("Erreur lors de la récupération des plannings:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les plannings"
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
          message: "Vous devez être connecté pour créer une disponibilité"
        }
      }, { status: 401 });
    }

    // Vérifier les permissions (seuls les prestataires, livreurs et admins peuvent créer des disponibilités)
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isDeliveryPerson = session.user.role === UserRole.DELIVERY_PERSON;
    const isServiceProvider = session.user.role === UserRole.SERVICE_PROVIDER;
    const isProvider = isDeliveryPerson || isServiceProvider;

    if (!isProvider && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à créer des disponibilités"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedData = createAvailabilitySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de disponibilité invalides",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const availabilityData = validatedData.data;
    
    // Vérification de la cohérence des créneaux horaires
    for (const slot of availabilityData.timeSlots) {
      if (slot.startTime >= slot.endTime) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_TIME_SLOT",
            message: "L'heure de début doit être antérieure à l'heure de fin"
          }
        }, { status: 400 });
      }
    }

    // Vérifier que la date est dans le futur
    const availabilityDate = new Date(availabilityData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (availabilityDate < today) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATE",
          message: "La date de disponibilité doit être dans le futur"
        }
      }, { status: 400 });
    }

    // Vérifier la cohérence de la récurrence
    if (availabilityData.recurrent) {
      if (!availabilityData.recurrencePattern) {
        return NextResponse.json({
          success: false,
          error: {
            code: "MISSING_RECURRENCE_PATTERN",
            message: "Un modèle de récurrence est requis pour les disponibilités récurrentes"
          }
        }, { status: 400 });
      }
      
      if (!availabilityData.recurrenceEndDate) {
        return NextResponse.json({
          success: false,
          error: {
            code: "MISSING_RECURRENCE_END_DATE",
            message: "Une date de fin de récurrence est requise pour les disponibilités récurrentes"
          }
        }, { status: 400 });
      }
      
      const recurrenceEndDate = new Date(availabilityData.recurrenceEndDate);
      if (recurrenceEndDate <= availabilityDate) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_RECURRENCE_END_DATE",
            message: "La date de fin de récurrence doit être postérieure à la date de début"
          }
        }, { status: 400 });
      }
    }

    // Vérifier les zones de service si spécifiées
    if (availabilityData.serviceAreaIds && availabilityData.serviceAreaIds.length > 0) {
      const serviceAreasCount = await prisma.serviceArea.count({
        where: {
          id: {
            in: availabilityData.serviceAreaIds
          }
        }
      });

      if (serviceAreasCount !== availabilityData.serviceAreaIds.length) {
        return NextResponse.json({
          success: false,
          error: {
            code: "SERVICE_AREAS_NOT_FOUND",
            message: "Une ou plusieurs zones de service spécifiées n'existent pas"
          }
        }, { status: 404 });
      }
    }

    // Création des disponibilités avec transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer la disponibilité de base
      const availability = await tx.userAvailability.create({
        data: {
          userId: session.user.id,
          date: availabilityDate,
          recurrent: availabilityData.recurrent,
          recurrencePattern: availabilityData.recurrencePattern,
          recurrenceEndDate: availabilityData.recurrenceEndDate ? new Date(availabilityData.recurrenceEndDate) : null,
          workType: availabilityData.workType,
          maxCapacity: availabilityData.maxCapacity || 1,
          notes: availabilityData.notes,
          excludeDates: availabilityData.excludeDates
        }
      });

      // Créer les créneaux horaires
      const timeSlots = await tx.availabilityTimeSlot.createMany({
        data: availabilityData.timeSlots.map(slot => ({
          availabilityId: availability.id,
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      });

      // Associer les zones de service si spécifiées
      if (availabilityData.serviceAreaIds && availabilityData.serviceAreaIds.length > 0) {
        await tx.userAvailability.update({
          where: { id: availability.id },
          data: {
            serviceAreas: {
              connect: availabilityData.serviceAreaIds.map(id => ({ id }))
            }
          }
        });
      }

      // Si c'est une disponibilité récurrente, créer les occurrences futures
      if (availabilityData.recurrent && availabilityData.recurrencePattern && availabilityData.recurrenceEndDate) {
        const startDate = new Date(availabilityDate);
        const endDate = new Date(availabilityData.recurrenceEndDate);
        const excludeDates = availabilityData.excludeDates ? 
          availabilityData.excludeDates.map(date => new Date(date).toISOString().split('T')[0]) : [];
        
        const recurrenceInstances = [];
        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + 1); // Commencer au jour suivant
        
        while (currentDate <= endDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          
          // Vérifier si la date n'est pas exclue
          if (!excludeDates.includes(dateString)) {
            // Selon le modèle de récurrence, décider si cette date doit être incluse
            let shouldInclude = false;
            
            switch (availabilityData.recurrencePattern) {
              case "DAILY":
                shouldInclude = true;
                break;
              case "WEEKLY":
                // Même jour de la semaine
                shouldInclude = currentDate.getDay() === startDate.getDay();
                break;
              case "BIWEEKLY":
                // Même jour de la semaine toutes les deux semaines
                const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                shouldInclude = (currentDate.getDay() === startDate.getDay()) && (Math.floor(diffDays / 7) % 2 === 0);
                break;
              case "MONTHLY":
                // Même date du mois
                shouldInclude = currentDate.getDate() === startDate.getDate();
                break;
            }
            
            if (shouldInclude) {
              recurrenceInstances.push({
                parentAvailabilityId: availability.id,
                date: new Date(currentDate),
                workType: availabilityData.workType,
                maxCapacity: availabilityData.maxCapacity || 1,
                notes: availabilityData.notes,
                userId: session.user.id
              });
            }
          }
          
          // Passer au jour suivant
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Créer les instances récurrentes si elles existent
        if (recurrenceInstances.length > 0) {
          await tx.recurrentAvailabilityInstance.createMany({
            data: recurrenceInstances
          });
        }
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "USER_AVAILABILITY",
          entityId: availability.id,
          userId: session.user.id,
          details: JSON.stringify({
            date: availabilityDate.toISOString(),
            workType: availabilityData.workType,
            timeSlots: availabilityData.timeSlots.length,
            recurrent: availabilityData.recurrent
          })
        }
      });

      return {
        availability,
        timeSlotsCount: timeSlots.count
      };
    });

    // Récupérer la disponibilité créée avec tous ses détails
    const createdAvailability = await prisma.userAvailability.findUnique({
      where: { id: result.availability.id },
      include: {
        timeSlots: true,
        serviceAreas: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: createdAvailability
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