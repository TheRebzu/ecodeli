import { NextRequest, NextResponse } from "next/server";
import { BidService } from "@/lib/services/client/bid.service";
import { auth } from "@/auth";

// GET: Récupérer les offres d'un livreur
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Récupérer les paramètres de requête
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate")
      ? new Date(searchParams.get("fromDate") as string)
      : undefined;
    const toDate = searchParams.get("toDate")
      ? new Date(searchParams.get("toDate") as string)
      : undefined;

    // Récupérer les offres du livreur
    const result = await BidService.getCourierBids(
      session.user.id,
      {
        status: status || undefined,
        fromDate,
        toDate,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching courier bids:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 