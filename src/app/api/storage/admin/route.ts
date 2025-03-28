import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BoxSize, BoxStatus, UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

// Schéma pour créer une nouvelle box
const createBoxSchema = z.object({
  size: z.nativeEnum(BoxSize),
  locationId: z.string().uuid(),
  reference: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  status: z.nativeEnum(BoxStatus).default(BoxStatus.AVAILABLE),
  isTemperatureControlled: z.boolean().default(false),
  temperatureRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  features: z.array(z.string()).optional()
});

// Schéma pour les actions en masse
const bulkActionSchema = z.object({
  action: z.enum(["CREATE", "UPDATE", "DELETE"]),
  boxIds: z.array(z.string().uuid()).optional(),
  locationId: z.string().uuid().optional(),
  size: z.nativeEnum(BoxSize).optional(),
  count: z.number().int().positive().max(100).optional(),
  updateData: z.object({
    status: z.nativeEnum(BoxStatus).optional(),
    locationId: z.string().uuid().optional(),
    isTemperatureControlled: z.boolean().optional(),
    temperatureRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    features: z.array(z.string()).optional()
  }).optional()
});

// Schéma pour les statistiques
const statsQuerySchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).default("month"),
  locationId: z.string().uuid().optional(),
  includeHistory: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour créer une box de stockage"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des box de stockage"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = createBoxSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de box invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const boxData = validatedBody.data;

    // Vérifier que l'emplacement existe
    const location = await prisma.storageLocation.findUnique({
      where: { id: boxData.locationId }
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

    // Vérifier si une référence existe déjà
    if (boxData.reference) {
      const existingBox = await prisma.storageBox.findFirst({
        where: {
          reference: boxData.reference,
          locationId: boxData.locationId
        }
      });

      if (existingBox) {
        return NextResponse.json({
          success: false,
          error: {
            code: "REFERENCE_EXISTS",
            message: "Une box avec cette référence existe déjà à cet emplacement"
          }
        }, { status: 400 });
      }
    } else {
      // Générer une référence unique si non fournie
      const boxCount = await prisma.storageBox.count({
        where: { locationId: boxData.locationId }
      });
      
      const locationPrefix = location.name.substring(0, 3).toUpperCase();
      const sizePrefix = boxData.size.substring(0, 1);
      boxData.reference = `${locationPrefix}-${sizePrefix}${(boxCount + 1).toString().padStart(3, '0')}`;
    }

    // Créer la box et l'audit log dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer la box
      const box = await tx.storageBox.create({
        data: boxData
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "STORAGE_BOX",
          entityId: box.id,
          userId: session.user.id,
          details: JSON.stringify({
            size: box.size,
            locationId: box.locationId,
            reference: box.reference
          })
        }
      });

      return box;
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la box:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de créer la box de stockage"
      }
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer des actions en masse"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent effectuer des actions en masse"
        }
      }, { status: 403 });
    }

    // Analyse du corps de la requête
    const body = await req.json();
    const validatedBody = bulkActionSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données d'action en masse invalides",
          details: validatedBody.error.format()
        }
      }, { status: 400 });
    }

    const { action, boxIds, locationId, size, count, updateData } = validatedBody.data;

    // Exécuter l'action en fonction du type
    let result;
    switch (action) {
      case "CREATE":
        // Créer plusieurs box
        if (!locationId || !size || !count) {
          return NextResponse.json({
            success: false,
            error: {
              code: "MISSING_PARAMETERS",
              message: "Pour créer des box en masse, veuillez fournir locationId, size et count"
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

        // Compter les box existantes pour générer des références
        const boxCount = await prisma.storageBox.count({
          where: { locationId }
        });

        // Créer les box en masse dans une transaction
        result = await prisma.$transaction(async (tx) => {
          const createdBoxes = [];
          const locationPrefix = location.name.substring(0, 3).toUpperCase();
          const sizePrefix = size.substring(0, 1);

          for (let i = 0; i < count; i++) {
            const reference = `${locationPrefix}-${sizePrefix}${(boxCount + i + 1).toString().padStart(3, '0')}`;
            
            const box = await tx.storageBox.create({
              data: {
                size,
                locationId,
                reference,
                status: BoxStatus.AVAILABLE
              }
            });
            
            createdBoxes.push(box);

            // Créer un journal d'audit
            await tx.auditLog.create({
              data: {
                action: "CREATE",
                entityType: "STORAGE_BOX",
                entityId: box.id,
                userId: session.user.id,
                details: JSON.stringify({
                  size: box.size,
                  locationId: box.locationId,
                  reference: box.reference,
                  bulkCreation: true
                })
              }
            });
          }

          return createdBoxes;
        });
        break;

      case "UPDATE":
        // Mettre à jour plusieurs box
        if (!boxIds || !updateData) {
          return NextResponse.json({
            success: false,
            error: {
              code: "MISSING_PARAMETERS",
              message: "Pour mettre à jour des box en masse, veuillez fournir boxIds et updateData"
            }
          }, { status: 400 });
        }

        // Vérifier que toutes les box existent
        const existingBoxes = await prisma.storageBox.findMany({
          where: {
            id: { in: boxIds }
          }
        });

        if (existingBoxes.length !== boxIds.length) {
          return NextResponse.json({
            success: false,
            error: {
              code: "SOME_BOXES_NOT_FOUND",
              message: "Certaines box sélectionnées n'existent pas"
            }
          }, { status: 400 });
        }

        // Mettre à jour les box en masse dans une transaction
        result = await prisma.$transaction(async (tx) => {
          const updatedBoxes = [];

          for (const boxId of boxIds) {
            const updated = await tx.storageBox.update({
              where: { id: boxId },
              data: updateData
            });
            
            updatedBoxes.push(updated);

            // Créer un journal d'audit
            await tx.auditLog.create({
              data: {
                action: "UPDATE",
                entityType: "STORAGE_BOX",
                entityId: boxId,
                userId: session.user.id,
                details: JSON.stringify({
                  changes: updateData,
                  bulkUpdate: true
                })
              }
            });
          }

          return updatedBoxes;
        });
        break;

      case "DELETE":
        // Supprimer plusieurs box
        if (!boxIds) {
          return NextResponse.json({
            success: false,
            error: {
              code: "MISSING_PARAMETERS",
              message: "Pour supprimer des box en masse, veuillez fournir boxIds"
            }
          }, { status: 400 });
        }

        // Vérifier que toutes les box existent et qu'elles ne sont pas réservées
        const boxesToDelete = await prisma.storageBox.findMany({
          where: {
            id: { in: boxIds }
          },
          include: {
            currentReservation: true
          }
        });

        if (boxesToDelete.length !== boxIds.length) {
          return NextResponse.json({
            success: false,
            error: {
              code: "SOME_BOXES_NOT_FOUND",
              message: "Certaines box sélectionnées n'existent pas"
            }
          }, { status: 400 });
        }

        const reservedBoxes = boxesToDelete.filter(box => box.status === BoxStatus.RESERVED);
        if (reservedBoxes.length > 0) {
          return NextResponse.json({
            success: false,
            error: {
              code: "BOXES_RESERVED",
              message: "Certaines box sélectionnées sont actuellement réservées et ne peuvent pas être supprimées",
              details: reservedBoxes.map(box => box.reference || box.id)
            }
          }, { status: 400 });
        }

        // Supprimer les box en masse dans une transaction
        result = await prisma.$transaction(async (tx) => {
          const deletedIds = [];

          for (const box of boxesToDelete) {
            // Supprimer toutes les réservations passées liées à cette box
            await tx.boxReservation.deleteMany({
              where: {
                boxId: box.id,
                status: { in: ["CANCELLED", "COMPLETED"] }
              }
            });
            
            // Supprimer la box
            await tx.storageBox.delete({
              where: { id: box.id }
            });
            
            deletedIds.push(box.id);

            // Créer un journal d'audit
            await tx.auditLog.create({
              data: {
                action: "DELETE",
                entityType: "STORAGE_BOX",
                entityId: box.id,
                userId: session.user.id,
                details: JSON.stringify({
                  reference: box.reference,
                  locationId: box.locationId,
                  size: box.size,
                  bulkDelete: true
                })
              }
            });
          }

          return deletedIds;
        });
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        result
      }
    });
  } catch (error) {
    console.error("Erreur lors de l'exécution de l'action en masse:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible d'exécuter l'action en masse"
      }
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour consulter les statistiques"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent consulter les statistiques"
        }
      }, { status: 403 });
    }

    // Analyse des paramètres de requête
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = statsQuerySchema.safeParse(queryParams);

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

    const { period, locationId, includeHistory } = validatedQuery.data;

    // Calculer la date de début en fonction de la période
    const startDate = new Date();
    switch (period) {
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Construire les conditions de filtrage
    const whereClause: Prisma.BoxReservationWhereInput = {
      createdAt: {
        gte: startDate
      }
    };

    if (locationId) {
      whereClause.boxId = {
        in: (await prisma.storageBox.findMany({
          where: { locationId },
          select: { id: true }
        })).map(box => box.id)
      };
    }

    // Récupérer les statistiques de réservation
    const reservationStats = await prisma.boxReservation.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: whereClause
    });

    // Récupérer le taux d'occupation
    const totalBoxes = await prisma.storageBox.count({
      where: locationId ? { locationId } : {}
    });

    const reservedBoxes = await prisma.storageBox.count({
      where: {
        ...(locationId ? { locationId } : {}),
        status: BoxStatus.RESERVED
      }
    });

    // Statistiques par taille
    const sizeStats = await prisma.storageBox.groupBy({
      by: ['size'],
      _count: {
        id: true
      },
      where: locationId ? { locationId } : {}
    });

    // Statistiques par emplacement
    const locationStats = await prisma.storageLocation.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            boxes: true
          }
        }
      }
    });

    // Historique des réservations
    let reservationHistory = null;
    if (includeHistory) {
      reservationHistory = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as count
        FROM "BoxReservation"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date
      `;
    }

    // Construire la réponse
    const response = {
      period,
      date: {
        start: startDate,
        end: new Date()
      },
      occupancyRate: totalBoxes > 0 ? (reservedBoxes / totalBoxes) * 100 : 0,
      reservations: {
        total: reservationStats.reduce((sum, stat) => sum + Number(stat._count.id), 0),
        byStatus: reservationStats.reduce((acc, stat) => {
          acc[stat.status] = Number(stat._count.id);
          return acc;
        }, {} as Record<string, number>)
      },
      boxes: {
        total: totalBoxes,
        reserved: reservedBoxes,
        available: totalBoxes - reservedBoxes,
        bySize: sizeStats.reduce((acc, stat) => {
          acc[stat.size] = Number(stat._count.id);
          return acc;
        }, {} as Record<string, number>)
      },
      locations: locationStats.map(loc => ({
        id: loc.id,
        name: loc.name,
        boxCount: loc._count.boxes
      }))
    };

    if (reservationHistory) {
      response.history = reservationHistory;
    }

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les statistiques"
      }
    }, { status: 500 });
  }
} 