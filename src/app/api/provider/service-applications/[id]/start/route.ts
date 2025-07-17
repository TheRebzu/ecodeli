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
    console.log("🔄 [POST /api/provider/service-applications/[id]/start] ID:", id);

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'application existe et appartient au prestataire
    const application = await db.serviceApplication.findFirst({
      where: {
        id,
        providerId: user.id,
        status: "PAID"
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
        { error: "Application non trouvée ou non payée" },
        { status: 404 }
      );
    }

    // Mettre à jour le statut vers IN_PROGRESS
    const updatedApplication = await db.serviceApplication.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        updatedAt: new Date()
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

    // Créer une notification pour le client
    await db.notification.create({
      data: {
        userId: application.announcement.authorId,
        type: "SERVICE_STARTED",
        title: "Service commencé",
        message: `Le prestataire a commencé votre service "${application.announcement.title}".`,
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
      
      await EmailService.sendServiceStartedEmail(
        application.announcement.author.email,
        {
          clientName,
          providerName,
          serviceName: application.announcement.title,
          serviceDescription: application.announcement.description,
          startedAt: new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }),
          estimatedDuration: application.estimatedDuration || undefined,
          serviceId: id
        },
        "fr"
      );
      
      console.log("📧 Email de démarrage envoyé au client:", application.announcement.author.email);
    } catch (emailError) {
      console.error("❌ Erreur envoi email de démarrage:", emailError);
      // Ne pas faire échouer l'API si l'email échoue
    }

    console.log("✅ Application commencée avec succès:", id);

    return NextResponse.json({
      success: true,
      application: updatedApplication
    });

  } catch (error) {
    console.error("❌ Erreur lors du démarrage de l'application:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 