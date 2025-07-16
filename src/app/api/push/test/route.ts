import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
      
      const result = await OneSignalService.sendToUser(
        userId,
        title,
        message,
        { test: true },
        {}
      );

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in test route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
