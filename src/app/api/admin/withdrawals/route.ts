import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET - Récupérer toutes les demandes de retrait
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      type: "WITHDRAWAL",
    };

    if (status) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.walletOperation.findMany({
        where,
        include: {
          deliverer: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.walletOperation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting withdrawals:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes de retrait" },
      { status: 500 },
    );
  }
}
