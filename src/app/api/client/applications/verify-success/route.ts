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
          paymentStatus: paymentStatus,
          paidAt: new Date(),
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
    }

    const successData = {
      applicationId: applicationId || "app_" + Math.random().toString(36).substr(2, 9),
      amount: applicationData?.proposedPrice || 0,
      providerName: applicationData?.provider?.profile?.firstName 
        ? `${applicationData.provider.profile.firstName} ${applicationData.provider.profile.lastName}`
        : "Prestataire EcoDeli",
      serviceTitle: applicationData?.announcement?.title || "Service demandé",
      status: "success",
      paymentStatus: applicationData?.paymentStatus || paymentStatus,
      paidAt: applicationData?.paidAt || new Date(),
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