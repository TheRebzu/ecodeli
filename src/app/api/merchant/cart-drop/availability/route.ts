import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CartDropService } from "@/features/merchant/services/cart-drop.service";

// GET - Vérifie la disponibilité d'un créneau
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(dateParam);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    const available = await CartDropService.checkSlotAvailability(
      session.user.id,
      scheduledDate,
    );

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error checking slot availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
