import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MerchantPromotionsService } from "@/features/merchant/services/promotions.service";

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

    // Récupération des templates
    const templates = await MerchantPromotionsService.getCampaignTemplates();

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Erreur API templates promotions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
