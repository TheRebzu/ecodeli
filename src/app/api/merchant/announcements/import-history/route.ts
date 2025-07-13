import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BulkImportService } from "@/features/merchant/services/bulk-import.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || undefined;

    const result = await BulkImportService.getImportHistory(session.user.id, {
      page,
      limit,
      status,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur récupération historique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique" },
      { status: 500 },
    );
  }
}
