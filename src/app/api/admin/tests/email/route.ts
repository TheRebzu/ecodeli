import { NextRequest, NextResponse } from "next/server";
import {
  TestsService,
  EmailTestRequest,
} from "@/features/admin/services/tests.service";
import { z } from "zod";

const emailTestSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  type: z.enum([
    "welcome",
    "verification",
    "password-reset",
    "delivery-confirmation",
    "payment-success",
    "document-approved",
    "custom",
  ]),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validatedData = emailTestSchema.parse(body);

    // Envoi de l'email de test
    const result = await TestsService.sendTestEmail(
      validatedData as EmailTestRequest,
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Erreur dans la route de test email:", error);

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
    // Récupération des logs de tests d'emails récents
    const logs = await TestsService.getTestLogs(20);
    const emailLogs = logs.filter((log) => log.category === "TEST_EMAIL");

    return NextResponse.json({
      success: true,
      data: {
        logs: emailLogs,
        count: emailLogs.length,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des logs email:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erreur lors de la récupération des logs",
      },
      { status: 500 },
    );
  }
}
