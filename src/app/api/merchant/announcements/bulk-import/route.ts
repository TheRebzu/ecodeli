import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BulkImportService } from "@/features/merchant/services/bulk-import.service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const body = await request.json();
    const { announcements } = body;

    if (!announcements || !Array.isArray(announcements)) {
      return NextResponse.json(
        { error: "Données d'annonces invalides" },
        { status: 400 },
      );
    }

    if (announcements.length === 0) {
      return NextResponse.json(
        { error: "Aucune annonce à importer" },
        { status: 400 },
      );
    }

    if (announcements.length > 1000) {
      return NextResponse.json(
        { error: "Trop d'annonces (maximum 1000 par import)" },
        { status: 400 },
      );
    }

    // Importer les annonces
    const result = await BulkImportService.importAnnouncements(
      session.user.id,
      announcements,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur import bulk:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import" },
      { status: 500 },
    );
  }
}
