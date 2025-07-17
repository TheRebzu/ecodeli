import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/features/notifications/services/notification.service";

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message, sendPush } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, title, message" },
        { status: 400 }
      );
    }

    // Créer la notification avec OneSignal
    const notification = await createNotification({
      userId,
      type: "TEST_NOTIFICATION",
      title,
      message,
      data: {
        testMode: true,
        timestamp: new Date().toISOString(),
      },
      sendPush: sendPush || true,
      priority: "high",
    });

    return NextResponse.json({
      success: true,
      notification,
      message: "Notification de test envoyée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur test notification:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de l'envoi de la notification",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 