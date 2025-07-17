import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

const responseSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  message: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log(
      "🔍 [POST /api/client/applications/[id]/respond] Réponse client à candidature",
    );

    const user = await getUserFromSession(request);
    if (!user || user.role !== "CLIENT") {
      console.log("❌ Utilisateur non authentifié ou non client");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Client authentifié:", user.id, user.role);

    const { id: applicationId } = await params;
    const body = await request.json();

    try {
      const validatedData = responseSchema.parse(body);
      console.log("✅ Données de réponse validées:", validatedData);

      // Vérifier que la candidature existe et appartient au client
      const application = await db.serviceApplication.findUnique({
        where: { id: applicationId },
        include: {
          announcement: {
            include: {
              author: true,
            },
          },
          provider: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!application) {
        console.log("❌ Candidature non trouvée");
        return NextResponse.json(
          { error: "Candidature non trouvée" },
          { status: 404 },
        );
      }

      // Vérifier que le client est bien l'auteur de la demande de service
      if (application.announcement.authorId !== user.id) {
        console.log("❌ Accès non autorisé à cette candidature");
        return NextResponse.json(
          { error: "Accès non autorisé" },
          { status: 403 },
        );
      }

      // Vérifier que la candidature n'a pas déjà été traitée
      if (application.status !== "PENDING") {
        console.log("❌ Candidature déjà traitée");
        return NextResponse.json(
          {
            error: "Cette candidature a déjà été traitée",
          },
          { status: 400 },
        );
      }

      console.log("🔍 Traitement de la réponse...");

      // Mettre à jour le statut de la candidature
      const updatedApplication = await db.serviceApplication.update({
        where: { id: applicationId },
        data: {
          status: validatedData.action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        },
      });

      console.log(
        `✅ Candidature ${validatedData.action === "ACCEPT" ? "acceptée" : "refusée"}`,
      );

      // Si acceptée, mettre à jour le statut de la demande de service
      let createdBooking = null;
      if (validatedData.action === "ACCEPT") {
        await db.announcement.update({
          where: { id: application.announcementId },
          data: {
            status: "IN_PROGRESS",
          },
        });
        console.log("✅ Demande de service mise à jour: IN_PROGRESS");

        // Récupérer le clientId réel (table Client) à partir de l'userId de l'auteur de l'annonce
        const client = await db.client.findUnique({
          where: { userId: application.announcement.authorId },
        });
        if (!client) {
          return NextResponse.json({ error: "Client introuvable pour l'annonce." }, { status: 400 });
        }

        // Récupérer le providerId réel (table Provider) à partir de l'userId du provider de l'application
        const provider = await db.provider.findUnique({
          where: { userId: application.providerId },
        });
        if (!provider) {
          return NextResponse.json({ error: "Provider introuvable pour la candidature." }, { status: 400 });
        }

        // Récupérer le serviceId réel à partir de l'annonce (serviceDetails.serviceId ou announcement.serviceId)
        let serviceId = undefined;
        if (application.announcement.serviceDetails?.serviceId) {
          serviceId = application.announcement.serviceDetails.serviceId;
        } else if (application.announcement.serviceId) {
          serviceId = application.announcement.serviceId;
        }
        
        // Si pas de serviceId et que c'est une annonce de type service, créer un service temporaire
        if (!serviceId && application.announcement.type === "HOME_SERVICE") {
          // Créer un service temporaire pour ce provider
          const tempService = await db.service.create({
            data: {
              providerId: provider.id,
              name: `Service temporaire - ${application.announcement.title}`,
              description: application.announcement.description,
              type: "HOME_SERVICE",
              basePrice: application.proposedPrice || application.announcement.budget || 0,
              priceUnit: "HOUR",
              duration: application.estimatedDuration || 60,
              isActive: true,
              minAdvanceBooking: 24,
              maxAdvanceBooking: 720,
            },
          });
          serviceId = tempService.id;
        }
        
        if (!serviceId) {
          return NextResponse.json({ error: "Service introuvable pour l'annonce." }, { status: 400 });
        }

        // Créer le booking (réservation) pour ce provider et ce client
        // Vérifier qu'il n'existe pas déjà un booking pour cette annonce/provider/service
        const existingBooking = await db.booking.findFirst({
          where: {
            clientId: client.id,
            providerId: provider.id,
            serviceId,
          },
        });
        let createdBooking = null;
        if (!existingBooking) {
          createdBooking = await db.booking.create({
            data: {
              clientId: client.id,
              providerId: provider.id,
              serviceId,
              status: "PENDING",
              scheduledDate: application.announcement.location?.scheduledAt
                ? new Date(application.announcement.location.scheduledAt)
                : new Date(),
              scheduledTime: application.announcement.location?.scheduledAt
                ? new Date(application.announcement.location.scheduledAt).toISOString().slice(11, 19)
                : "00:00:00",
              duration: application.estimatedDuration || 60,
              address: application.announcement.location
                ? {
                    address: application.announcement.location.address,
                    city: application.announcement.location.city,
                  }
                : {},
              totalPrice: application.proposedPrice || application.announcement.budget || 0,
              notes: application.message || undefined,
            },
          });
        }
      }

      // Créer une notification pour le prestataire
      const notificationTitle =
        validatedData.action === "ACCEPT"
          ? "Candidature acceptée"
          : "Candidature refusée";

      const notificationMessage =
        validatedData.action === "ACCEPT"
          ? `Votre candidature pour "${application.announcement.title}" a été acceptée !`
          : `Votre candidature pour "${application.announcement.title}" a été refusée.`;

      await db.notification.create({
        data: {
          userId: application.provider.id,
          title: notificationTitle,
          message: notificationMessage,
          type:
            validatedData.action === "ACCEPT"
              ? "APPLICATION_ACCEPTED"
              : "APPLICATION_REJECTED",
          data: {
            applicationId: applicationId,
            // serviceRequestId: application.serviceRequestId, // <-- supprimé car non présent
            clientMessage: validatedData.message,
          },
        },
      });

      console.log("✅ Notification créée pour le prestataire");

      return NextResponse.json({
        success: true,
        application: {
          id: updatedApplication.id,
          status: updatedApplication.status,
          respondedAt: ("respondedAt" in updatedApplication && updatedApplication.respondedAt)
            ? updatedApplication.respondedAt.toISOString()
            : undefined,
        },
        booking: createdBooking ? {
          id: createdBooking.id,
          status: createdBooking.status,
          scheduledDate: createdBooking.scheduledDate,
          providerId: createdBooking.providerId,
          serviceId: createdBooking.serviceId,
        } : undefined,
      });
    } catch (validationError) {
      console.error("❌ Erreur de validation:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Données invalides", details: validationError.issues || validationError.message },
          { status: 400 },
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error("❌ Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
