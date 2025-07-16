import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, title, message, data } = await request.json();

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
      const { getOneSignalService } = await import("@/features/notifications/services/onesignal.service");
      
      const oneSignalService = getOneSignalService();
      
      const result = await oneSignalService.sendToUser(userId, {
        title,
        message,
        data: data || {},
      });

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in push notification route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Envoyer des notifications en lot
export async function PUT(request: NextRequest) {
  try {
    const user = await auth();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un admin
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can send bulk notifications" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = bulkNotificationSchema.parse(body);

    const results = await oneSignalService.sendBulkNotification(
      validatedData.userIds,
      validatedData.title,
      validatedData.message,
      validatedData.data,
    );

    const successCount = results.filter(Boolean).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Bulk notification sent: ${successCount} successful, ${failureCount} failed`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error sending bulk notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET - Get notification history (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await auth();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admin users can view notification history" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = searchParams.get("userId");

    // In a real implementation, you would store notification history in the database
    // For now, we'll return a mock response
    const mockNotifications = [
      {
        id: "1",
        userId: "user1",
        title: "Test notification",
        message: "This is a test notification",
        type: "GENERAL",
        sentAt: new Date().toISOString(),
        status: "sent",
      },
    ];

    return NextResponse.json({
      notifications: mockNotifications,
      total: mockNotifications.length,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
