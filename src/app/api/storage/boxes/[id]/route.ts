import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BoxStatus, UserRole } from "@prisma/client";

// Schéma pour mettre à jour une réservation
const updateReservationSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  specialRequirements: z.string().max(500).optional(),
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
});

export async function GET(
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
          message: "Vous devez être connecté pour consulter cette box de stockage"
        }
      }, { status: 401 });
    }

    const { id } = params;

    // Récupérer la box avec ses informations détaillées
    const box = await prisma.storageBox.findUnique({
      where: { id },
      include: {
        location: true,
        currentReservation: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        reservations: {
          orderBy: {
            startDate: "desc"
          },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            reservations: true
          }
        }
      }
    });

    if (!box) {
      return NextResponse.json({
        success: false,
        error: {
          code: "BOX_NOT_FOUND",
          message: "Box de stockage non trouvée"
        }
      }, { status: 404 });
    }

    // Vérifier les permissions - admin peut tout voir, utilisateur seulement ses propres réservations
    const userRole = session.user.role || "USER";
    const isAdmin = userRole === UserRole.ADMIN;

    // Filtrer les réservations si l'utilisateur n'est pas admin
    if (!isAdmin) {
      box.reservations = box.reservations.filter(res => res.user.id === session.user.id);
      
      // Si l'utilisateur n'a jamais réservé cette box et n'est pas admin, il ne peut pas la voir
      if (box.reservations.length === 0 && (!box.currentReservation || box.currentReservation.user.id !== session.user.id)) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'avez pas accès à cette box de stockage"
          }
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: box
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de la box:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les détails de la box de stockage"
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
          message: "Vous devez être connecté pour modifier cette réservation"
        }
      }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    // Vérifier que la box existe
    const box = await prisma.storageBox.findUnique({
      where: { id },
      include: {
        currentReservation: true
      }
    });

    if (!box) {
      return NextResponse.json({
        success: false,
        error: {
          code: "BOX_NOT_FOUND",
          message: "Box de stockage non trouvée"
        }
      }, { status: 404 });
    }

    // Vérifier que la box a une réservation en cours
    if (!box.currentReservation) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NO_ACTIVE_RESERVATION",
          message: "Cette box n'a pas de réservation active"
        }
      }, { status: 400 });
    }

    // Vérifier que l'utilisateur est autorisé à modifier cette réservation
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isOwner = box.currentReservation.userId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à modifier cette réservation"
        }
      }, { status: 403 });
    }

    // Valider les données de mise à jour
    const validatedData = updateReservationSchema.safeParse(body);
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

    const updateData = validatedData.data;
    
    // Valider les dates si elles sont fournies
    if (updateData.startDate && updateData.endDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);
      
      if (startDate >= endDate) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_DATE_RANGE",
            message: "La date de début doit être antérieure à la date de fin"
          }
        }, { status: 400 });
      }
      
      // Vérifier que la date de début est dans le futur pour les réservations non confirmées
      if (startDate < new Date() && box.currentReservation.status === "PENDING") {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_START_DATE",
            message: "La date de début doit être dans le futur"
          }
        }, { status: 400 });
      }

      // Vérifier les conflits avec d'autres réservations (sauf la réservation en cours)
      const conflictingReservations = await prisma.boxReservation.findFirst({
        where: {
          boxId: id,
          id: { not: box.currentReservation.id },
          status: { in: ["CONFIRMED", "PENDING"] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      if (conflictingReservations) {
        return NextResponse.json({
          success: false,
          error: {
            code: "BOOKING_CONFLICT",
            message: "Il y a un conflit avec une autre réservation existante"
          }
        }, { status: 400 });
      }
    } else if (updateData.startDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = box.currentReservation.endDate;
      
      if (startDate >= endDate) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_DATE_RANGE",
            message: "La date de début doit être antérieure à la date de fin"
          }
        }, { status: 400 });
      }
    } else if (updateData.endDate) {
      const endDate = new Date(updateData.endDate);
      const startDate = box.currentReservation.startDate;
      
      if (startDate >= endDate) {
        return NextResponse.json({
          success: false,
          error: {
            code: "INVALID_DATE_RANGE",
            message: "La date de début doit être antérieure à la date de fin"
          }
        }, { status: 400 });
      }
    }

    // Contrôle d'accès supplémentaire pour certains champs
    if (!isAdmin && updateData.status) {
      // Les utilisateurs normaux ne peuvent que annuler
      if (updateData.status !== "CANCELLED") {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas modifier le statut de cette réservation"
          }
        }, { status: 403 });
      }
    }

    // Mettre à jour la réservation
    const updatedReservation = await prisma.$transaction(async (tx) => {
      // Mise à jour de la réservation
      const updated = await tx.boxReservation.update({
        where: { id: box.currentReservation!.id },
        data: updateData,
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

      // Si le statut est mis à jour à "CANCELLED", libérer la box
      if (updateData.status === "CANCELLED") {
        await tx.storageBox.update({
          where: { id },
          data: {
            status: BoxStatus.AVAILABLE,
            lastReservationId: null
          }
        });
      } else if (updateData.status === "COMPLETED") {
        await tx.storageBox.update({
          where: { id },
          data: {
            status: BoxStatus.AVAILABLE,
            lastReservationId: updated.id
          }
        });
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "BOX_RESERVATION",
          entityId: updated.id,
          userId: session.user.id,
          details: JSON.stringify({
            boxId: id,
            previousStatus: box.currentReservation!.status,
            newStatus: updateData.status,
            startDate: updateData.startDate,
            endDate: updateData.endDate
          })
        }
      });

      // Créer une notification pour l'administrateur
      if (!isAdmin) {
        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true }
        });

        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: "Réservation de box modifiée",
            message: `La réservation de box ${box.id} a été modifiée par ${session.user.name || session.user.email}`,
            type: "BOX_RESERVATION_UPDATE",
            referenceId: updated.id
          }))
        });
      }

      // Créer une notification pour l'utilisateur si modifié par l'admin
      if (isAdmin && !isOwner) {
        await tx.notification.create({
          data: {
            userId: box.currentReservation!.userId,
            title: "Votre réservation a été modifiée",
            message: `Votre réservation de box a été modifiée par un administrateur`,
            type: "BOX_RESERVATION_UPDATE",
            referenceId: updated.id
          }
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedReservation
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la réservation:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de mettre à jour la réservation de box"
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
          message: "Vous devez être connecté pour annuler cette réservation"
        }
      }, { status: 401 });
    }

    const { id } = params;

    // Vérifier que la box existe
    const box = await prisma.storageBox.findUnique({
      where: { id },
      include: {
        currentReservation: true
      }
    });

    if (!box) {
      return NextResponse.json({
        success: false,
        error: {
          code: "BOX_NOT_FOUND",
          message: "Box de stockage non trouvée"
        }
      }, { status: 404 });
    }

    // Vérifier que la box a une réservation en cours
    if (!box.currentReservation) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NO_ACTIVE_RESERVATION",
          message: "Cette box n'a pas de réservation active"
        }
      }, { status: 400 });
    }

    // Vérifier que l'utilisateur est autorisé à annuler cette réservation
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isOwner = box.currentReservation.userId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à annuler cette réservation"
        }
      }, { status: 403 });
    }

    // Vérifier que la réservation peut être annulée
    const currentDate = new Date();
    const startDate = box.currentReservation.startDate;
    const isWithin24Hours = startDate.getTime() - currentDate.getTime() < 24 * 60 * 60 * 1000;

    if (isWithin24Hours && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TOO_LATE_TO_CANCEL",
          message: "Impossible d'annuler une réservation à moins de 24 heures de son début"
        }
      }, { status: 400 });
    }

    // Annuler la réservation dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour la réservation comme annulée
      const updatedReservation = await tx.boxReservation.update({
        where: { id: box.currentReservation!.id },
        data: {
          status: "CANCELLED"
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Mettre à jour la box comme disponible
      await tx.storageBox.update({
        where: { id },
        data: {
          status: BoxStatus.AVAILABLE,
          lastReservationId: null
        }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "BOX_RESERVATION",
          entityId: updatedReservation.id,
          userId: session.user.id,
          details: JSON.stringify({
            boxId: id,
            startDate: box.currentReservation!.startDate,
            endDate: box.currentReservation!.endDate,
            cancelledBy: isOwner ? "USER" : "ADMIN"
          })
        }
      });

      // Créer une notification pour l'administrateur
      if (!isAdmin) {
        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true }
        });

        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: "Réservation de box annulée",
            message: `La réservation de box ${box.id} a été annulée par ${session.user.name || session.user.email}`,
            type: "BOX_RESERVATION_CANCELLED",
            referenceId: updatedReservation.id
          }))
        });
      }

      // Créer une notification pour l'utilisateur si annulée par l'admin
      if (isAdmin && !isOwner) {
        await tx.notification.create({
          data: {
            userId: box.currentReservation!.userId,
            title: "Votre réservation a été annulée",
            message: `Votre réservation de box a été annulée par un administrateur`,
            type: "BOX_RESERVATION_CANCELLED",
            referenceId: updatedReservation.id
          }
        });
      }

      return updatedReservation;
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Réservation annulée avec succès",
        reservation: result
      }
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de la réservation:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible d'annuler la réservation de box"
      }
    }, { status: 500 });
  }
} 