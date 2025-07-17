import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { EmailService } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("✅ [POST /api/provider/service-applications/[id]/complete] ID:", id);

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer les données du corps de la requête (optionnel)
    const body = await request.json().catch(() => ({}));
    const { report, photos, notes } = body;

    // Vérifier que l'application existe et appartient au prestataire
    const application = await db.serviceApplication.findFirst({
      where: {
        id,
        providerId: user.id,
        status: "IN_PROGRESS"
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application non trouvée ou non en cours" },
        { status: 404 }
      );
    }

    // Mettre à jour le statut vers COMPLETED
    const updatedApplication = await db.serviceApplication.update({
      where: { id },
      data: {
        status: "COMPLETED",
        updatedAt: new Date(),
        // Ajouter les informations de fin si fournies
        ...(report && { message: `${application.message || ''}\n\nRapport de fin: ${report}` }),
        ...(notes && { message: `${application.message || ''}\n\nNotes: ${notes}` })
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    });

    // Mettre à jour le statut de l'annonce si nécessaire
    await db.announcement.update({
      where: { id: application.announcementId },
      data: {
        status: "COMPLETED",
        updatedAt: new Date()
      }
    });

    // Créer une notification pour le client
    await db.notification.create({
      data: {
        userId: application.announcement.authorId,
        type: "SERVICE_COMPLETED",
        title: "Service terminé",
        message: `Votre service "${application.announcement.title}" a été terminé avec succès.`,
        data: {
          serviceApplicationId: id,
          announcementId: application.announcementId
        }
      }
    });

    // Envoyer un email au client
    try {
      const clientName = `${application.announcement.author.profile?.firstName || ""} ${application.announcement.author.profile?.lastName || ""}`.trim() || "Client";
      const providerName = user.name || "Prestataire";
      
      await EmailService.sendServiceCompletedEmail(
        application.announcement.author.email,
        {
          clientName,
          providerName,
          serviceName: application.announcement.title,
          serviceDescription: application.announcement.description,
          completedAt: new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }),
          actualDuration: application.estimatedDuration || undefined,
          serviceId: id
        },
        "fr"
      );
      
      console.log("📧 Email de fin de service envoyé au client:", application.announcement.author.email);
    } catch (emailError) {
      console.error("❌ Erreur envoi email de fin de service:", emailError);
      // Ne pas faire échouer l'API si l'email échoue
    }

    console.log("✅ Application terminée avec succès:", id);

    return NextResponse.json({
      success: true,
      application: updatedApplication
    });

  } catch (error) {
    console.error("❌ Erreur lors de la finalisation de l'application:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 