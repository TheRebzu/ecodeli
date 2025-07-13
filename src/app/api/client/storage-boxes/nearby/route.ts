import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { StorageBoxService } from "@/features/storage/services/storage-box.service";

/**
 * GET - Récupérer les box de stockage à proximité
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "10");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Coordonnées géographiques requises" },
        { status: 400 },
      );
    }

    const boxes = await StorageBoxService.findNearbyBoxes(lat, lng, radius);

    // Filtrer par critères supplémentaires si fournis
    const city = searchParams.get("city");
    const size = searchParams.get("size");
    const maxPrice = searchParams.get("maxPrice");

    let filteredBoxes = boxes;

    if (city) {
      filteredBoxes = filteredBoxes.filter((box) =>
        box.location.city.toLowerCase().includes(city.toLowerCase()),
      );
    }

    if (size) {
      filteredBoxes = filteredBoxes.filter((box) => box.size === size);
    }

    if (maxPrice) {
      const maxPriceNum = parseFloat(maxPrice);
      filteredBoxes = filteredBoxes.filter(
        (box) => box.pricePerDay <= maxPriceNum,
      );
    }

    return NextResponse.json({
      success: true,
      boxes: filteredBoxes,
      userLocation: { lat, lng },
      searchRadius: radius,
    });
  } catch (error) {
    console.error("Error getting nearby storage boxes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche des box à proximité" },
      { status: 500 },
    );
  }
}
