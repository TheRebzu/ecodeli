import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        documents: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count documents by status
    const documents = user.documents || [];
    const documentsStatus = {
      total: documents.length,
      approved: documents.filter((d) => d.status === "APPROVED").length,
      pending: documents.filter((d) => d.status === "PENDING").length,
      rejected: documents.filter((d) => d.status === "REJECTED").length,
    };

    // Count certifications (mock data for now)
    const certificationsCount = 3; // This would come from actual certifications table

    // Calculate completion rate
    const profileFields = [
      user.profile?.firstName,
      user.profile?.lastName,
      user.profile?.phone,
      user.profile?.address,
      user.profile?.city,
    ];
    const completedFields = profileFields.filter(
      (field) => field && field.trim().length > 0,
    ).length;
    const completionRate = Math.round(
      (completedFields / profileFields.length) * 100,
    );

    // Determine profile strength
    let profileStrength: "WEAK" | "MEDIUM" | "STRONG" = "WEAK";
    if (completionRate >= 80 && documentsStatus.approved >= 2) {
      profileStrength = "STRONG";
    } else if (completionRate >= 50 && documentsStatus.approved >= 1) {
      profileStrength = "MEDIUM";
    }

    // Identify missing elements
    const missingElements = [];
    if (!user.profile?.firstName || !user.profile?.lastName) {
      missingElements.push("Nom et prénom");
    }
    if (!user.profile?.phone) {
      missingElements.push("Numéro de téléphone");
    }
    if (!user.profile?.address) {
      missingElements.push("Adresse complète");
    }
    if (documentsStatus.approved === 0) {
      missingElements.push("Documents validés");
    }
    if (certificationsCount === 0) {
      missingElements.push("Certifications professionnelles");
    }

    const overview = {
      completionRate,
      isVerified: user.profile?.verified || false,
      documentsStatus,
      certificationsCount,
      profileStrength,
      missingElements,
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error fetching profile overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
