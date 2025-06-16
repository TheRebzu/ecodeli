import { NextRequest, NextResponse } from "next/server";
import getServerSession from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions as authOptions } from "@/server/auth/next-auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Vérification de la sécurité
    const authHeader = request.headers.get("Authorization");
    if (
      !authHeader ||
      authHeader !== `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
    ) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Unauthorized"  }),
        {
          status: 401},
      );
    }

    // Traiter l'événement de notification
    if (body.event === "notification.clicked") {
      const { userId, type } = body.data.custom;

      if (userId && type) {
        // Mettre à jour les statistiques de notification si nécessaire
        await db.notificationMetric.create({
          data: {
            userId,
            type,
            action: "CLICKED",
            timestamp: new Date()}});
      }
    }

    return new NextResponse(JSON.stringify({ success  }), { status: 200 });
  } catch (error) {
    console.error("Error in OneSignal webhook:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: "Internal server error"  }),
      {
        status: 500},
    );
  }
}
