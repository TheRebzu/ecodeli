import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pour le moment, retourner un historique vide
    // Dans une vraie implémentation, il faudrait une table ImportHistory
    const mockHistory = [
      {
        id: "1",
        filename: "annonces_janvier.csv",
        status: "COMPLETED",
        totalRows: 50,
        processedRows: 50,
        successfulRows: 45,
        errorRows: 5,
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 jour avant
        completedAt: new Date(Date.now() - 86000000).toISOString(),
        errors: [
          { row: 12, field: "price", message: "Prix invalide" },
          { row: 23, field: "address", message: "Adresse trop courte" },
        ],
      },
      {
        id: "2",
        filename: "produits_fevrier.xlsx",
        status: "FAILED",
        totalRows: 20,
        processedRows: 5,
        successfulRows: 0,
        errorRows: 5,
        createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 jours avant
        completedAt: new Date(Date.now() - 431000000).toISOString(),
        errors: [
          { row: 1, field: "type", message: "Type d'annonce non supporté" },
          { row: 2, field: "description", message: "Description trop courte" },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      imports: mockHistory,
    });
  } catch (error) {
    console.error("❌ Erreur récupération historique imports:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'historique",
        imports: [],
      },
      { status: 500 },
    );
  }
}
