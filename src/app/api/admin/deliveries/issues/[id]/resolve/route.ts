import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Vérifier l'authentification admin
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adminId } = await request.json();

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 400 });
    }

    // Marquer le problème comme résolu
    const updatedIssue = await prisma.deliveryIssue.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminId,
      },
    });

    return NextResponse.json({
      success: true,
      issue: updatedIssue,
    });
  } catch (error) {
    console.error("Error resolving delivery issue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
