import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MerchantNotificationsService } from "@/features/merchant/services/notifications.service";
import { z } from "zod";

const getNotificationsSchema = z.object({
  merchantId: z.string(),
  filters: z
    .object({
      category: z.string().optional(),
      priority: z.string().optional(),
      unreadOnly: z.boolean().optional(),
      actionRequired: z.boolean().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérification du rôle
    if (session.user.role !== "MERCHANT" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Récupération des paramètres
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId") || session.user.id;
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const actionRequired = searchParams.get("actionRequired") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Vérification des permissions
    if (session.user.role === "MERCHANT" && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: "Accès refusé à ces données" },
        { status: 403 },
      );
    }

    // Récupération des notifications
    const result = await MerchantNotificationsService.getNotifications(
      merchantId,
      {
        category: category as any,
        priority: priority as any,
        unreadOnly,
        actionRequired,
        page,
        limit,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API notifications GET:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérification du rôle
    if (session.user.role !== "MERCHANT" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Validation des données
    const body = await request.json();
    const { merchantId, filters } = getNotificationsSchema.parse(body);

    // Vérification des permissions
    if (session.user.role === "MERCHANT" && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: "Accès refusé à ces données" },
        { status: 403 },
      );
    }

    // Récupération des notifications avec filtres
    const result = await MerchantNotificationsService.getNotifications(
      merchantId,
      filters,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API notifications POST:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
