import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const unsubscribeSchema = z.object({
  endpoint: z.string(),
});

/**
 * POST - Se désabonner des notifications push
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = unsubscribeSchema.parse(body);

    // Désactiver l'abonnement push
    await prisma.pushSubscription.updateMany({
      where: {
        userId: session.user.id,
        endpoint: validatedData.endpoint,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Mettre à jour les préférences (désactiver toutes les notifications)
    await prisma.userNotificationSettings.upsert({
      where: {
        userId: session.user.id,
      },
      create: {
        userId: session.user.id,
        enabled: false,
        deliveryUpdates: false,
        newOpportunities: false,
        paymentNotifications: false,
        systemAlerts: false,
        marketing: false,
        soundEnabled: false,
        vibrationEnabled: false,
      },
      update: {
        enabled: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Désabonnement des notifications push effectué",
    });
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors du désabonnement" },
      { status: 500 },
    );
  }
}
