import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // TODO: Implement actual content moderation data fetching
    // For now, return mock data
    const mockData = {
      items: [
        {
          id: "1",
          type: "ANNOUNCEMENT",
          title: "Livraison Paris-Lyon",
          content: "Annonce avec prix anormalement élevé",
          status: "PENDING",
          reportedBy: "user123",
          reportedUser: "user456",
          createdAt: "2024-01-15T10:30:00Z",
          priority: "HIGH",
        },
        {
          id: "2",
          type: "REVIEW",
          title: "Avis négatif",
          content: "Avis contenant des propos inappropriés",
          status: "REVIEWED",
          reportedBy: "user789",
          reportedUser: "user101",
          createdAt: "2024-01-15T09:15:00Z",
          priority: "MEDIUM",
        },
      ],
      stats: {
        pending: 12,
        reviewed: 45,
        approved: 156,
        rejected: 23,
      },
      total: 2,
      page,
      limit,
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error("Error fetching moderation data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, itemId, reason } = body;

    if (!action || !itemId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // TODO: Implement actual content moderation actions
    console.log("Moderation action:", {
      action,
      itemId,
      reason,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Content ${action} successfully`,
    });
  } catch (error) {
    console.error("Error processing moderation action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
