import { NextRequest, NextResponse } from "next/server";
import { BidService } from "@/lib/services/client/bid.service";
import { auth } from "@/auth";

// GET: Récupérer une offre spécifique
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Cette fonctionnalité nécessiterait une méthode spécifique dans le BidService
    // Pour l'instant, on renvoie juste une erreur
    return NextResponse.json(
      { success: false, error: "Not implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error fetching bid:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH: Mettre à jour une offre
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    
    // Ensure the bid ID is included
    data.id = params.bidId;

    const result = await BidService.updateBid(
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating bid:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Supprimer une offre
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; bidId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Cette fonctionnalité nécessiterait une méthode spécifique dans le BidService
    // Pour l'instant, on renvoie juste une erreur
    return NextResponse.json(
      { success: false, error: "Not implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error deleting bid:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 