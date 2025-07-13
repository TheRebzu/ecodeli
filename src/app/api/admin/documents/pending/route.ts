import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const type = searchParams.get("type");
    const userRole = searchParams.get("userRole");
    const userId = searchParams.get("userId");

    const whereConditions: any = {
      validationStatus: status as any,
    };

    if (type) {
      whereConditions.type = type;
    }

    if (userRole) {
      whereConditions.user = {
        role: userRole,
      };
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    const documents = await prisma.document.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: doc.originalName,
        url: doc.url,
        validationStatus: doc.validationStatus,
        createdAt: doc.createdAt.toISOString(),
        user: {
          id: doc.user.id,
          email: doc.user.email,
          role: doc.user.role,
          profile: {
            firstName: doc.user.profile?.firstName,
            lastName: doc.user.profile?.lastName,
          },
        },
        validationNotes: doc.rejectionReason,
      })),
    });
  } catch (error) {
    console.error("Erreur récupération documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
