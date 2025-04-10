import { NextRequest, NextResponse } from "next/server";
import { BidService } from "@/lib/services/client/mock-bid-service";
import { auth } from "@/auth";

// POST: Accepter une offre
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; "bid-id": string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await BidService.acceptBid(
      session.user.id,
      params["bid-id"]
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error accepting bid:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 