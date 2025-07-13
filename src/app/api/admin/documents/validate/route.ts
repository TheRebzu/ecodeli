import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth/utils";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { DocumentType } from "@prisma/client";

/**
 * Schéma de validation pour approuver/rejeter un document
 */
const validateDocumentSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/documents/validate
 * Validation documents par admin (livreurs/prestataires)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé - rôle admin requis" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { documentId, action, reason } = body;

    if (!documentId || !action) {
      return NextResponse.json(
        { error: "documentId et action requis" },
        { status: 400 },
      );
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide. Utilisez APPROVED ou REJECTED" },
        { status: 400 },
      );
    }

    // Mettre à jour le statut du document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        validationStatus: action,
        validatedBy: user.id,
        validatedAt: new Date(),
        rejectionReason: action === "REJECTED" ? reason : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Si le document est approuvé, vérifier si tous les documents de l'utilisateur sont approuvés
    if (action === "APPROVED") {
      const userDocuments = await prisma.document.findMany({
        where: {
          userId: updatedDocument.userId,
        },
      });

      const allApproved = userDocuments.every(
        (doc) => doc.validationStatus === "APPROVED",
      );

      if (allApproved) {
        // Activer l'utilisateur selon son rôle
        const userRole = updatedDocument.user.role;

        switch (userRole) {
          case "DELIVERER":
            await prisma.deliverer.update({
              where: { userId: updatedDocument.userId },
              data: {
                isActive: true,
                validationStatus: "VALIDATED",
              },
            });
            break;

          case "PROVIDER":
            await prisma.provider.update({
              where: { userId: updatedDocument.userId },
              data: {
                isActive: true,
                validationStatus: "VALIDATED",
              },
            });
            break;
        }

        // Mettre à jour le statut de validation de l'utilisateur
        await prisma.user.update({
          where: { id: updatedDocument.userId },
          data: {
            validationStatus: "VALIDATED",
            isActive: true,
          },
        });

        // Notification d'activation complète
        try {
          await NotificationService.notifyAccountActivated(
            updatedDocument.userId,
            userRole === "DELIVERER" ? "deliverer" : "provider",
          );
        } catch (notifError) {
          console.warn("Erreur notification OneSignal activation:", notifError);
        }
      }
    }

    // Notification pour la validation individuelle du document
    try {
      await NotificationService.notifyDocumentValidation(
        updatedDocument.userId,
        updatedDocument.type,
        action,
        action === "REJECTED" ? reason : undefined,
      );
    } catch (notifError) {
      console.warn("Erreur notification OneSignal validation:", notifError);
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Erreur validation document:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * GET /api/admin/documents/validate
 * Liste des documents en attente de validation
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const userRole = searchParams.get("role");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Construire les filtres
    const where: any = {
      validationStatus: status as any,
    };

    if (userRole) {
      where.user = {
        role: userRole,
      };
    }

    // Récupérer documents avec pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              validationStatus: true,
            },
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    // Statistiques de validation
    const stats = await getValidationStats();

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error) {
    console.error("Erreur récupération documents:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Vérifier si tous les documents obligatoires sont validés
 */
async function checkAllDocumentsValidated(user: any) {
  const requiredDocs: DocumentType[] =
    user.role === "DELIVERER"
      ? [
          DocumentType.IDENTITY,
          DocumentType.DRIVING_LICENSE,
          DocumentType.INSURANCE,
        ]
      : [DocumentType.IDENTITY, DocumentType.CERTIFICATION]; // Prestataires

  const approvedDocs = await prisma.document.findMany({
    where: {
      userId: user.id,
      validationStatus: "APPROVED",
      type: { in: requiredDocs },
    },
  });

  // Si tous les documents sont approuvés, activer le profil
  if (approvedDocs.length === requiredDocs.length) {
    if (user.role === "DELIVERER") {
      await prisma.deliverer.update({
        where: { userId: user.id },
        data: {
          validationStatus: "VALIDATED",
          isActive: true,
        },
      });
    } else if (user.role === "PROVIDER") {
      await prisma.provider.update({
        where: { userId: user.id },
        data: {
          validationStatus: "VALIDATED",
          isActive: true,
        },
      });
    }

    // Activer le compte utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        validationStatus: "VALIDATED",
        isActive: true,
      },
    });

    // Notification d'activation complète
    await NotificationService.notifyAccountActivated(
      user.id,
      user.role === "DELIVERER" ? "deliverer" : "provider",
    );
  }
}

/**
 * Logger les actions admin
 */
async function logAdminAction(adminId: string, action: string, details: any) {
  try {
    // Note: ActivityLog model may not exist yet
    console.log("Admin action:", {
      adminId,
      action,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erreur log admin:", error);
  }
}

/**
 * Statistiques de validation des documents
 */
async function getValidationStats() {
  const [pending, approved, rejected, deliverersPending, providersPending] =
    await Promise.all([
      prisma.document.count({ where: { validationStatus: "PENDING" } }),
      prisma.document.count({ where: { validationStatus: "APPROVED" } }),
      prisma.document.count({ where: { validationStatus: "REJECTED" } }),
      prisma.document.count({
        where: {
          validationStatus: "PENDING",
          user: { role: "DELIVERER" },
        },
      }),
      prisma.document.count({
        where: {
          validationStatus: "PENDING",
          user: { role: "PROVIDER" },
        },
      }),
    ]);

  return {
    pending,
    approved,
    rejected,
    deliverersPending,
    providersPending,
  };
}
