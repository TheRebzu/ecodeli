import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StorageBoxService } from "@/features/storage/services/storage-box.service";

/**
 * GET - Récupérer les box de stockage disponibles et les locations du client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      city: searchParams.get("city") || undefined,
      size: searchParams.get("size") || undefined,
      priceMin: searchParams.get("priceMin")
        ? parseFloat(searchParams.get("priceMin")!)
        : undefined,
      priceMax: searchParams.get("priceMax")
        ? parseFloat(searchParams.get("priceMax")!)
        : undefined,
      isAvailable: true,
    };

    const boxes = await StorageBoxService.getAvailableBoxes(filters);

    // Si l'utilisateur est un client, récupérer ses locations
    let clientRentals = [];
    if (session.user.role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId: session.user.id },
      });

      if (client) {
        clientRentals = await StorageBoxService.getClientRentals(client.id);
      }
    }

    return NextResponse.json({
      success: true,
      boxes,
      rentals: clientRentals,
    });
  } catch (error) {
    console.error("Error getting storage boxes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des box" },
      { status: 500 },
    );
  }
}
