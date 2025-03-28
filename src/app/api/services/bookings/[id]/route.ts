import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BookingStatus, Prisma, UserRole } from "@prisma/client";

// Schéma pour la mise à jour d'une réservation
const updateBookingSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  notes: z.string().max(500).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  specialRequirements: z.string().max(500).optional().nullable(),
  adminNotes: z.string().max(500).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Vous devez être connecté pour consulter une réservation",
          },
        },
        { status: 401 }
      );
    }

    const bookingId = params.id;

    // Récupérer la réservation avec ses données associées
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            durationMinutes: true,
            imageUrl: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Réservation non trouvée",
          },
        },
        { status: 404 }
      );
    }

    // Vérifier les autorisations
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Utilisateur non trouvé",
          },
        },
        { status: 404 }
      );
    }

    const isOwner = booking.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;

    // Seuls le propriétaire ou un administrateur peuvent voir une réservation
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'avez pas la permission de consulter cette réservation",
          },
        },
        { status: 403 }
      );
    }

    // Retourner la réservation
    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la réservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Impossible de récupérer la réservation",
        },
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Vous devez être connecté pour modifier une réservation",
          },
        },
        { status: 401 }
      );
    }

    const bookingId = params.id;

    // Récupérer l'état actuel de la réservation
    const currentBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
          },
        },
      },
    });

    if (!currentBooking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Réservation non trouvée",
          },
        },
        { status: 404 }
      );
    }

    // Vérifier les autorisations
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Utilisateur non trouvé",
          },
        },
        { status: 404 }
      );
    }

    const isOwner = currentBooking.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;

    // Analyser et valider les données de mise à jour
    const body = await req.json();
    const validatedBody = updateBookingSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Données de mise à jour invalides",
            details: validatedBody.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updateData = validatedBody.data;

    // Permissions et restrictions de mise à jour
    // 1. Les utilisateurs peuvent mettre à jour leurs propres réservations mais pas changer le statut
    // 2. Les administrateurs peuvent mettre à jour n'importe quelle réservation et changer le statut
    const baseUpdateData: Prisma.BookingUpdateInput = {};

    // Vérifier si l'utilisateur peut faire ces mises à jour
    if (isOwner && !isAdmin) {
      // Les propriétaires ne peuvent pas changer le statut ou ajouter des notes admin
      if (updateData.status || updateData.adminNotes) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message:
                "Vous n'avez pas la permission de changer le statut ou d'ajouter des notes administratives",
            },
          },
          { status: 403 }
        );
      }

      // Les utilisateurs ne peuvent mettre à jour que certains champs
      if (updateData.notes !== undefined) baseUpdateData.notes = updateData.notes;
      if (updateData.address !== undefined) baseUpdateData.address = updateData.address;
      if (updateData.contactPhone !== undefined) baseUpdateData.contactPhone = updateData.contactPhone;
      if (updateData.specialRequirements !== undefined) baseUpdateData.specialRequirements = updateData.specialRequirements;

      // Les mises à jour de date par l'utilisateur sont soumises à des restrictions
      if (updateData.scheduledDate) {
        // Vérifier que la réservation n'est pas déjà confirmée
        if (currentBooking.status === BookingStatus.CONFIRMED) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "ALREADY_CONFIRMED",
                message: "Impossible de modifier la date d'une réservation confirmée",
              },
            },
            { status: 400 }
          );
        }

        // Vérifier que la nouvelle date est dans le futur
        const newDate = new Date(updateData.scheduledDate);
        if (newDate < new Date()) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_DATE",
                message: "La date de réservation doit être dans le futur",
              },
            },
            { status: 400 }
          );
        }

        // Vérifier la disponibilité du créneau
        const conflictingBooking = await prisma.booking.findFirst({
          where: {
            id: { not: bookingId },
            serviceId: currentBooking.serviceId,
            scheduledDate: {
              gte: new Date(newDate.getTime() - 30 * 60000), // 30 minutes avant
              lte: new Date(
                newDate.getTime() + currentBooking.service.durationMinutes * 60000
              ), // Durée du service après
            },
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
        });

        if (conflictingBooking) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "SLOT_UNAVAILABLE",
                message: "Ce créneau horaire n'est pas disponible",
              },
            },
            { status: 409 }
          );
        }

        baseUpdateData.scheduledDate = newDate;
      }
    } else if (isAdmin) {
      // Les admins peuvent mettre à jour tous les champs
      if (updateData.scheduledDate) baseUpdateData.scheduledDate = new Date(updateData.scheduledDate);
      if (updateData.notes !== undefined) baseUpdateData.notes = updateData.notes;
      if (updateData.address !== undefined) baseUpdateData.address = updateData.address;
      if (updateData.contactPhone !== undefined) baseUpdateData.contactPhone = updateData.contactPhone;
      if (updateData.specialRequirements !== undefined) baseUpdateData.specialRequirements = updateData.specialRequirements;
      if (updateData.adminNotes !== undefined) baseUpdateData.adminNotes = updateData.adminNotes;
      
      // Mise à jour du statut par l'admin
      if (updateData.status) {
        baseUpdateData.status = updateData.status;
      }
    } else {
      // Non autorisé à mettre à jour cette réservation
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'avez pas la permission de modifier cette réservation",
          },
        },
        { status: 403 }
      );
    }

    // S'il n'y a rien à mettre à jour, retourner une erreur
    if (Object.keys(baseUpdateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_UPDATE",
            message: "Aucun champ valide à mettre à jour fourni",
          },
        },
        { status: 400 }
      );
    }

    // S'il y a un changement de statut, le noter
    const hasStatusChange = updateData.status && updateData.status !== currentBooking.status;

    // Mettre à jour la réservation dans une transaction
    await prisma.$transaction(async (tx) => {
      // Mettre à jour les données de la réservation
      await tx.booking.update({
        where: { id: bookingId },
        data: baseUpdateData,
      });

      // Créer une notification pour le propriétaire de la réservation si l'admin la modifie
      if (hasStatusChange && isAdmin && currentBooking.userId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: currentBooking.userId,
            title: "Statut de réservation mis à jour",
            message: `Votre réservation pour "${currentBooking.service.name}" a été mise à jour avec le statut: ${updateData.status}`,
            type: "BOOKING",
            referenceId: bookingId,
          },
        });
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "BOOKING",
          entityId: bookingId,
          userId: session.user.id,
          details: JSON.stringify({
            updatedFields: Object.keys(baseUpdateData),
            statusChange: hasStatusChange
              ? {
                  from: currentBooking.status,
                  to: updateData.status,
                }
              : undefined,
          }),
        },
      });
    });

    // Récupérer la réservation mise à jour avec les données associées
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la réservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Impossible de mettre à jour la réservation",
        },
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Vous devez être connecté pour annuler une réservation",
          },
        },
        { status: 401 }
      );
    }

    const bookingId = params.id;

    // Récupérer l'état actuel de la réservation
    const currentBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!currentBooking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Réservation non trouvée",
          },
        },
        { status: 404 }
      );
    }

    // Vérifier les autorisations
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Utilisateur non trouvé",
          },
        },
        { status: 404 }
      );
    }

    const isOwner = currentBooking.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;

    // Seuls le propriétaire ou un administrateur peuvent annuler une réservation
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'avez pas la permission d'annuler cette réservation",
          },
        },
        { status: 403 }
      );
    }

    // Vérifier si la réservation peut être annulée
    if (
      currentBooking.status === BookingStatus.COMPLETED ||
      currentBooking.status === BookingStatus.CANCELLED
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: `Impossible d'annuler une réservation qui est déjà ${
              currentBooking.status === BookingStatus.COMPLETED ? "terminée" : "annulée"
            }`,
          },
        },
        { status: 400 }
      );
    }

    // Vérifier si la réservation est trop proche pour être annulée (exemple: 24h avant)
    const isWithin24Hours =
      currentBooking.scheduledDate.getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;

    if (isWithin24Hours && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_LATE_TO_CANCEL",
            message: "Les réservations ne peuvent pas être annulées moins de 24 heures à l'avance",
          },
        },
        { status: 400 }
      );
    }

    // Traiter l'annulation dans une transaction
    await prisma.$transaction(async (tx) => {
      // Mettre à jour le statut de la réservation
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          adminNotes: isAdmin
            ? `Annulé par l'administrateur: ${session.user.name}`
            : `Annulé par l'utilisateur`,
        },
      });

      // Créer une notification pour l'autre partie
      if (isAdmin && currentBooking.userId !== session.user.id) {
        // Notifier l'utilisateur que sa réservation a été annulée par l'admin
        await tx.notification.create({
          data: {
            userId: currentBooking.userId,
            title: "Réservation annulée",
            message: `Votre réservation pour "${currentBooking.service.name}" a été annulée par un administrateur`,
            type: "BOOKING",
            referenceId: bookingId,
          },
        });
      } else if (isOwner) {
        // Notifier les admins qu'une réservation a été annulée
        const admins = await tx.user.findMany({
          where: { role: UserRole.ADMIN },
          select: { id: true },
        });

        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "Réservation annulée par l'utilisateur",
            message: `La réservation pour "${currentBooking.service.name}" a été annulée par l'utilisateur`,
            type: "BOOKING",
            referenceId: bookingId,
          })),
        });
      }

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "CANCEL",
          entityType: "BOOKING",
          entityId: bookingId,
          userId: session.user.id,
          details: JSON.stringify({
            previousStatus: currentBooking.status,
            cancelledBy: isOwner ? "user" : "admin",
            serviceName: currentBooking.service.name,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Réservation annulée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de la réservation:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Impossible d'annuler la réservation",
        },
      },
      { status: 500 }
    );
  }
} 