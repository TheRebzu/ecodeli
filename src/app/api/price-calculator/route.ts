import { NextRequest, NextResponse } from "next/server";
import { AnnouncementService } from "@/lib/services/client/announcement.service";
import { auth } from "@/auth";
import { Coordinates } from "@/shared/types/announcement.types";

// POST: Calculer un prix recommandé
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    // Cette fonctionnalité peut être utilisée sans authentification

    // Récupérer les données du corps de la requête
    const data = await req.json();

    // Validation basique
    if (!data.pickupCoordinates || !data.deliveryCoordinates || !data.weight) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Calculer le prix recommandé
    const result = await AnnouncementService.calculateRecommendedPrice(
      data.pickupCoordinates as Coordinates,
      data.deliveryCoordinates as Coordinates,
      data.weight,
      data.isFragile || false,
      data.requiresRefrigeration || false
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating price:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 