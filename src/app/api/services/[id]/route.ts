import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour la mise à jour d'un service
const updateServiceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().min(0).refine(
    (n) => Number(n.toFixed(2)) === n,
    { message: "Price must have at most 2 decimal places" }
  ).optional(),
  durationMinutes: z.number().int().min(15).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  maximumDistance: z.number().min(0).optional().nullable(),
  tags: z.array(z.string()).optional(),
  requiresVerification: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id;

    // Récupérer le service avec ses données associées
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            description: true,
          },
        },
        bookings: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            createdAt: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Service non trouvé",
          },
        },
        { status: 404 }
      );
    }

    // Calculer la note moyenne
    const averageRating = service.reviews.length > 0
      ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
      : null;

    // Retourner le service
    return NextResponse.json({
      success: true,
      data: {
        ...service,
        averageRating,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du service:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Impossible de récupérer le service",
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
            message: "Vous devez être connecté pour modifier un service",
          },
        },
        { status: 401 }
      );
    }

    const serviceId = params.id;

    // Récupérer l'état actuel du service
    const currentService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!currentService) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Service non trouvé",
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

    // Seuls les administrateurs peuvent modifier un service
    if (userFromDb.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à modifier ce service",
          },
        },
        { status: 403 }
      );
    }

    // Analyser et valider les données de mise à jour
    const body = await req.json();
    const validatedBody = updateServiceSchema.safeParse(body);

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

    // Vérifier la catégorie si elle est fournie
    if (updateData.categoryId) {
      const category = await prisma.serviceCategory.findUnique({
        where: { id: updateData.categoryId },
      });

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CATEGORY_NOT_FOUND",
              message: "Catégorie sélectionnée non trouvée",
            },
          },
          { status: 404 }
        );
      }
    }

    // Mettre à jour le service et créer un journal d'audit
    const [updatedService] = await prisma.$transaction([
      prisma.service.update({
        where: { id: serviceId },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "SERVICE",
          entityId: serviceId,
          userId: session.user.id,
          details: JSON.stringify({
            previousData: {
              name: currentService.name,
              price: currentService.price,
              isActive: currentService.isActive,
            },
            updatedFields: Object.keys(updateData),
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: updatedService,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du service:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Impossible de mettre à jour le service",
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
            message: "Vous devez être connecté pour supprimer un service",
          },
        },
        { status: 401 }
      );
    }

    const serviceId = params.id;

    // Récupérer l'état actuel du service
    const currentService = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        bookings: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
            },
          },
        },
      },
    });

    if (!currentService) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Service non trouvé",
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

    // Seuls les administrateurs peuvent supprimer un service
    if (userFromDb.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à supprimer ce service",
          },
        },
        { status: 403 }
      );
    }

    // Vérifier si le service a des réservations actives
    if (currentService.bookings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACTIVE_BOOKINGS",
            message:
              "Ce service a des réservations actives et ne peut pas être supprimé",
            details: {
              activeBookingsCount: currentService.bookings.length,
            },
          },
        },
        { status: 400 }
      );
    }

    // Procéder à la suppression (ou à la désactivation)
    await prisma.$transaction([
      // Option 1: Supprimer complètement le service
      prisma.service.delete({
        where: { id: serviceId },
      }),
      // Option 2 (alternative): Désactiver le service au lieu de le supprimer
      // prisma.service.update({
      //   where: { id: serviceId },
      //   data: { isActive: false },
      // }),
      prisma.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "SERVICE",
          entityId: serviceId,
          userId: session.user.id,
          details: JSON.stringify({
            name: currentService.name,
            categoryId: currentService.categoryId,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Service supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du service:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Impossible de supprimer le service",
        },
      },
      { status: 500 }
    );
  }
} 