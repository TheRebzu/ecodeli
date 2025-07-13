import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CartDropService } from "@/features/merchant/services/cart-drop.service";

// GET - Récupère les statistiques lâcher de chariot
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await CartDropService.getStats(session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching cart drop stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
