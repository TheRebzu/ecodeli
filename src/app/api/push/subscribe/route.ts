import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { playerId, deviceType } = await request.json();

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }

    // Vérifier si OneSignal est configuré
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal not configured" },
        { status: 503 }
      );
    }

    // Import conditionnel pour éviter les erreurs si OneSignal n'est pas configuré
    try {
      const { OneSignalService } = await import("@/lib/onesignal");
      
      // Mettre à jour ou créer le player OneSignal
      const result = await OneSignalService.upsertUser(
        session.user.id,
        playerId,
        {
          email: session.user.email,
          role: session.user.role,
          deviceType: deviceType || "unknown",
        }
      );

      // Sauvegarder l'association en base de données
      await prisma.pushSubscription.upsert({
        where: { userId: session.user.id },
        update: {
          playerId,
          deviceType,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          playerId,
          deviceType,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Push subscription updated successfully",
        playerId,
      });
    } catch (error) {
      console.error("Error updating push subscription:", error);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in subscribe route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
