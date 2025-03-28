import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour mettre à jour un emplacement
const updateLocationSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  address: z.string().min(5).max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  postalCode: z.string().min(3).max(20).optional(),
  country: z.string().min(2).max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  description: z.string().max(1000).optional(),
  openingHours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      isClosed: z.boolean().default(false)
    })
  ).optional(),
  isActive: z.boolean().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Récupérer l'emplacement avec des informations détaillées
    const location = await prisma.storageLocation.findUnique({
      where: { id },
      include: {
        boxes: {
          select: {
            id: true,
            size: true,
            status: true,
            _count: {
              select: {
                reservations: true
              }
            }
          }
        },
        _count: {
          select: {
            boxes: true
          }
        }
      }
    });

    if (!location) {
      return NextResponse.json({
        success: false,
        error: {
          code: "LOCATION_NOT_FOUND",
          message: "Emplacement de stockage non trouvé"
        }
      }, { status: 404 });
    }

    // Calculer des statistiques supplémentaires
    const boxCountBySize = await prisma.$queryRaw`
      SELECT size, COUNT(*) as count
      FROM "StorageBox"
      WHERE "locationId" = ${id}
      GROUP BY size
    `;

    const boxCountByStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM "StorageBox"
      WHERE "locationId" = ${id}
      GROUP BY status
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...location,
        statistics: {
          boxCountBySize,
          boxCountByStatus
        }
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de l'emplacement:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de récupérer les détails de l'emplacement de stockage"
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
          message: "Vous devez être connecté pour modifier un emplacement de stockage"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent modifier les emplacements de stockage"
        }
      }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    // Valider les données de mise à jour
    const validatedData = updateLocationSchema.safeParse(body);
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

    // Vérifier que l'emplacement existe
    const existingLocation = await prisma.storageLocation.findUnique({
      where: { id }
    });

    if (!existingLocation) {
      return NextResponse.json({
        success: false,
        error: {
          code: "LOCATION_NOT_FOUND",
          message: "Emplacement de stockage non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier que le nom n'est pas déjà pris par un autre emplacement
    if (validatedData.data.name && validatedData.data.name !== existingLocation.name) {
      const nameExists = await prisma.storageLocation.findFirst({
        where: {
          name: validatedData.data.name,
          id: { not: id }
        }
      });

      if (nameExists) {
        return NextResponse.json({
          success: false,
          error: {
            code: "NAME_EXISTS",
            message: "Un emplacement avec ce nom existe déjà"
          }
        }, { status: 400 });
      }
    }

    // Mettre à jour l'emplacement dans une transaction
    const updatedLocation = await prisma.$transaction(async (tx) => {
      // Mise à jour de l'emplacement
      const updated = await tx.storageLocation.update({
        where: { id },
        data: validatedData.data
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "STORAGE_LOCATION",
          entityId: updated.id,
          userId: session.user.id,
          details: JSON.stringify({
            previousName: existingLocation.name,
            newName: validatedData.data.name || existingLocation.name,
            changes: validatedData.data
          })
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedLocation
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'emplacement:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de mettre à jour l'emplacement de stockage"
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
          message: "Vous devez être connecté pour supprimer un emplacement de stockage"
        }
      }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent supprimer les emplacements de stockage"
        }
      }, { status: 403 });
    }

    const { id } = params;

    // Vérifier que l'emplacement existe
    const existingLocation = await prisma.storageLocation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            boxes: true
          }
        }
      }
    });

    if (!existingLocation) {
      return NextResponse.json({
        success: false,
        error: {
          code: "LOCATION_NOT_FOUND",
          message: "Emplacement de stockage non trouvé"
        }
      }, { status: 404 });
    }

    // Vérifier qu'il n'y a pas de box associées à cet emplacement
    if (existingLocation._count.boxes > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: "LOCATION_HAS_BOXES",
          message: "Impossible de supprimer un emplacement qui a des box associées"
        }
      }, { status: 400 });
    }

    // Supprimer l'emplacement dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Supprimer l'emplacement
      const deleted = await tx.storageLocation.delete({
        where: { id }
      });

      // Créer un journal d'audit
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "STORAGE_LOCATION",
          entityId: id,
          userId: session.user.id,
          details: JSON.stringify({
            name: existingLocation.name,
            address: existingLocation.address,
            city: existingLocation.city
          })
        }
      });

      return deleted;
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Emplacement de stockage supprimé avec succès",
        id,
        location: result
      }
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'emplacement:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Impossible de supprimer l'emplacement de stockage"
      }
    }, { status: 500 });
  }
} 