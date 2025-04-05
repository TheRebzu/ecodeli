import { NextRequest, NextResponse } from "next/server";
import { BidService } from "@/lib/services/client/bid.service";
import { auth } from "@/auth";

// POST: Rejeter une offre
export async function POST(
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

    const result = await BidService.rejectBid(
      session.user.id,
      params.bidId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error rejecting bid:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 