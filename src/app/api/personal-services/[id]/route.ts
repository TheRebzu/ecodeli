import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour mettre à jour un service à la personne
const updatePersonalServiceSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  price: z.number().min(0).optional(),
  durationMinutes: z.number().int().min(15).optional(),
  categoryId: z.string().uuid().optional(),
  availability: z.array(z.object({
    id: z.string().uuid().optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  })).optional(),
  serviceAreaIds: z.array(z.string().uuid()).optional(),
  requiresLicense: z.boolean().optional(),
  licenseType: z.string().optional(),
  maxParticipants: z.number().int().min(1).optional(),
  canBeRecurring: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  additionalDetails: z.record(z.string()).optional().nullable()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Session facultative pour cette route
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === UserRole.ADMIN;
    const userId = session?.user?.id;

    // Récupérer le service avec toutes ses relations
    const service = await prisma.personalService.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            rating: true,
            contactInfo: true
          }
        },
        serviceAreas: true,
        availability: true,
        reviews: {
          take: 5,
          orderBy: {
            createdAt: "desc"
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
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

    if (!service) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SERVICE_NOT_FOUND",
          message: "Service à la personne non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier si le service est actif. Si non, seul le propriétaire ou un admin peut le voir
    if (!service.isActive && !isAdmin && service.provider.id !== userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SERVICE_NOT_AVAILABLE",
          message: "Ce service à la personne n'est pas disponible"
        }
      }, { status: 403 });
    }

    // Calculer la note moyenne
    const averageRating = service.reviews.length > 0
      ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
      : null;

    // Obtenir les créneaux disponibles pour les prochains jours
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const availableSlots = await prisma.personalServiceBookingSlot.findMany({
      where: {
        personalServiceId: id,
        date: {
          gte: today,
          lte: nextWeek
        },
        isBooked: false
      },
      orderBy: {
        date: "asc"
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...service,
        averageRating,
        availableSlots
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du service:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer le service à la personne"
      }
    }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour modifier un service à la personne"
        }
      }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    // Valider les données de mise à jour
    const validatedData = updatePersonalServiceSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Données de mise à jour invalides",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    // Récupérer le service existant
    const existingService = await prisma.personalService.findUnique({
      where: { id },
      include: {
        availability: true
      }
    });

    if (!existingService) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SERVICE_NOT_FOUND",
          message: "Service à la personne non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier les permissions: soit le propriétaire, soit un admin
    const isOwner = existingService.providerId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à modifier ce service"
        }
      }, { status: 403 });
    }

    const updateData = validatedData.data;

    // Vérifier la catégorie si elle est fournie
    if (updateData.categoryId) {
      const category = await prisma.personalServiceCategory.findUnique({
        where: { id: updateData.categoryId }
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
    }

    // Vérifier les zones de service si elles sont fournies
    if (updateData.serviceAreaIds && updateData.serviceAreaIds.length > 0) {
      const serviceAreasCount = await prisma.serviceArea.count({
        where: {
          id: {
            in: updateData.serviceAreaIds
          }
        }
      });

      if (serviceAreasCount !== updateData.serviceAreaIds.length) {
        return NextResponse.json({
          success: false,
          error: {
            code: "SERVICE_AREAS_NOT_FOUND",
            message: "Une ou plusieurs zones de service spécifiées n'existent pas"
          }
        }, { status: 404 });
      }
    }

    // Mise à jour du service avec une transaction
    const updatedService = await prisma.$transaction(async (tx) => {
      // Mettre à jour le service de base
      const service = await tx.personalService.update({
        where: { id },
        data: {
          title: updateData.title,
          description: updateData.description,
          price: updateData.price,
          durationMinutes: updateData.durationMinutes,
          categoryId: updateData.categoryId,
          requiresLicense: updateData.requiresLicense,
          licenseType: updateData.licenseType,
          maxParticipants: updateData.maxParticipants,
          canBeRecurring: updateData.canBeRecurring,
          imageUrl: updateData.imageUrl,
          isActive: updateData.isActive,
          tags: updateData.tags,
          additionalDetails: updateData.additionalDetails
        },
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });

      // Mettre à jour les zones de service si spécifiées
      if (updateData.serviceAreaIds) {
        // Supprimer les associations existantes
        await tx.personalService.update({
          where: { id },
          data: {
            serviceAreas: {
              set: []
            }
          }
        });

        // Créer les nouvelles associations
        await tx.personalService.update({
          where: { id },
          data: {
            serviceAreas: {
              connect: updateData.serviceAreaIds.map(areaId => ({ id: areaId }))
            }
          }
        });
      }

      // Gérer les disponibilités si spécifiées
      if (updateData.availability) {
        // Supprimer les disponibilités existantes
        await tx.personalServiceAvailability.deleteMany({
          where: { personalServiceId: id }
        });

        // Créer les nouvelles disponibilités
        await tx.personalServiceAvailability.createMany({
          data: updateData.availability.map(slot => ({
            personalServiceId: id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime
          }))
        });
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "PERSONAL_SERVICE",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            previousTitle: existingService.title,
            newTitle: updateData.title || existingService.title,
            updatedFields: Object.keys(updateData).join(", ")
          })
        }
      });

      // Notifier le prestataire si l'admin a fait des modifications
      if (isAdmin && !isOwner) {
        await tx.notification.create({
          data: {
            userId: existingService.providerId,
            title: "Votre service a été modifié",
            message: `Votre service "${existingService.title}" a été modifié par un administrateur`,
            type: "SERVICE_UPDATED",
            referenceId: id
          }
        });
      }

      return service;
    });

    // Récupérer la version à jour du service avec toutes ses relations
    const fullUpdatedService = await prisma.personalService.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        serviceAreas: true,
        availability: true
      }
    });

    return NextResponse.json({
      success: true,
      data: fullUpdatedService
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du service:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de mettre à jour le service à la personne"
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour supprimer un service à la personne"
        }
      }, { status: 401 });
    }

    const { id } = params;

    // Récupérer le service avec ses réservations futures
    const service = await prisma.personalService.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            date: {
              gte: new Date()
            },
            status: {
              in: ["PENDING", "CONFIRMED"]
            }
          },
          select: { id: true }
        }
      }
    });

    if (!service) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SERVICE_NOT_FOUND",
          message: "Service à la personne non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier les permissions: soit le propriétaire, soit un admin
    const isOwner = service.providerId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à supprimer ce service"
        }
      }, { status: 403 });
    }

    // Vérifier si le service a des réservations actives
    if (service.bookings.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: "SERVICE_HAS_BOOKINGS",
          message: "Ce service a des réservations actives et ne peut pas être supprimé",
          details: {
            bookingsCount: service.bookings.length
          }
        }
      }, { status: 400 });
    }

    // Suppression du service avec transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer les disponibilités
      await tx.personalServiceAvailability.deleteMany({
        where: { personalServiceId: id }
      });

      // Supprimer les réservations passées
      await tx.personalServiceBooking.deleteMany({
        where: { personalServiceId: id }
      });

      // Supprimer les créneaux de réservation
      await tx.personalServiceBookingSlot.deleteMany({
        where: { personalServiceId: id }
      });

      // Supprimer les relations avec les zones de service
      await tx.personalService.update({
        where: { id },
        data: {
          serviceAreas: {
            set: []
          }
        }
      });

      // Supprimer le service
      await tx.personalService.delete({
        where: { id }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "PERSONAL_SERVICE",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            title: service.title,
            categoryId: service.categoryId
          })
        }
      });

      // Notifier le prestataire si l'admin a supprimé le service
      if (isAdmin && !isOwner) {
        await tx.notification.create({
          data: {
            userId: service.providerId,
            title: "Votre service a été supprimé",
            message: `Votre service "${service.title}" a été supprimé par un administrateur`,
            type: "SERVICE_DELETED",
            referenceId: null
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Service à la personne supprimé avec succès"
      }
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du service:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de supprimer le service à la personne"
      }
    }, { status: 500 });
  }
} 