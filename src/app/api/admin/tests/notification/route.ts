import { NextRequest, NextResponse } from "next/server";
import {
  TestsService,
  NotificationTestRequest,
} from "@/features/admin/services/tests.service";
import { z } from "zod";

const notificationTestSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  message: z.string().min(1, "Message requis"),
  targetType: z.enum(["all", "role", "user", "segment"]),
  targetValue: z.string().optional(),
  includeImage: z.boolean().optional(),
  imageUrl: z.string().url("URL d'image invalide").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validatedData = notificationTestSchema.parse(body);

    // Validation supplémentaire selon le type de ciblage
    if (validatedData.targetType === "role" && !validatedData.targetValue) {
      return NextResponse.json(
        {
          success: false,
          message: "Rôle requis pour le ciblage par rôle",
        },
        { status: 400 },
      );
    }

    if (validatedData.targetType === "user" && !validatedData.targetValue) {
      return NextResponse.json(
        {
          success: false,
          message: "Email utilisateur requis pour le ciblage utilisateur",
        },
        { status: 400 },
      );
    }

    if (validatedData.targetType === "segment" && !validatedData.targetValue) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de segment requis",
        },
        { status: 400 },
      );
    }

    // Envoi de la notification de test
    const result = await TestsService.sendTestNotification(
      validatedData as NotificationTestRequest,
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Erreur dans la route de test notification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Données invalides",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Erreur interne du serveur",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Récupération des logs de tests de notifications récents
    const logs = await TestsService.getTestLogs(20);
    const notificationLogs = logs.filter(
      (log) => log.category === "TEST_NOTIFICATION",
    );

    return NextResponse.json({
      success: true,
      data: {
        logs: notificationLogs,
        count: notificationLogs.length,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des logs notification:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de la récupération des logs",
      },
      { status: 500 },
    );
  }
}
