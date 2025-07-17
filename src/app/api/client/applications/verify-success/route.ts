import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, applicationId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Simuler la vérification Stripe (toujours succès)
    const paymentStatus = "PAID";
    let applicationData = null;

    if (applicationId) {
      // Mettre à jour le statut de paiement si non déjà payé
      applicationData = await prisma.serviceApplication.update({
        where: { id: applicationId },
        data: {
          status: paymentStatus, // Remplace paymentStatus par status
          updatedAt: new Date(),
        },
        include: {
          announcement: true,
          provider: {
            include: {
              profile: true,
            },
          },
        },
      });

      // Créer automatiquement le booking si non existant
      let clientId = applicationData.announcement.clientId;
      if (!clientId && applicationData.announcement.authorId) {
        const client = await prisma.client.findUnique({
          where: { userId: applicationData.announcement.authorId },
        });
        clientId = client?.id;
      }
      if (!clientId) {
        return NextResponse.json({ error: "Client introuvable pour l'annonce." }, { status: 400 });
      }
      const bookingWhere: any = {
        clientId,
        providerId: applicationData.providerId,
      };
      if (applicationData.announcement.serviceDetails?.serviceId) {
        bookingWhere.serviceId = applicationData.announcement.serviceDetails.serviceId;
      }
      const booking = await prisma.booking.findFirst({ where: bookingWhere });
      if (booking) {
        // Créer l'intervention si elle n'existe pas déjà
        const existingIntervention = await prisma.intervention.findFirst({
          where: { bookingId: booking.id, providerId: applicationData.providerId },
        });
        if (!existingIntervention) {
          await prisma.intervention.create({
            data: {
              bookingId: booking.id,
              providerId: applicationData.providerId,
              startTime: null,
              isCompleted: false,
            },
          });
        }
      }
    }

    const successData = {
      applicationId: applicationId || "app_" + Math.random().toString(36).substr(2, 9),
      amount: applicationData?.proposedPrice || 0,
      providerName: applicationData?.provider?.profile?.firstName 
        ? `${applicationData.provider.profile.firstName} ${applicationData.provider.profile.lastName}`
        : "Prestataire EcoDeli",
      serviceTitle: applicationData?.announcement?.title || "Service demandé",
      status: "success",
      paymentStatus: applicationData?.status || paymentStatus, // Utilise status
      paidAt: new Date(), // Simule la date de paiement
    };

    return NextResponse.json(successData);
  } catch (error) {
    console.error("Error verifying success:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 