import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Get details about a specific site
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const warehouseId = params.id;

    // Authentication is not required for site details
    // But we'll check session to provide personalized data if available
    const session = await getServerSession(authOptions);

    // Fetch the warehouse with related data
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
      include: {
        openingHours: true,
        storageBoxes: {
          select: {
            id: true,
            size: true,
            isOccupied: true,
            temperature: true,
            humidity: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Site not found" },
        { status: 404 }
      );
    }

    // Calculate availability statistics
    const totalBoxes = warehouse.storageBoxes.length;
    const availableBoxes = warehouse.storageBoxes.filter(box => !box.isOccupied).length;
    const availabilityPercentage = totalBoxes > 0 ? (availableBoxes / totalBoxes) * 100 : 0;

    // Count by box size
    const boxesBySize = warehouse.storageBoxes.reduce((acc, box) => {
      const size = box.size;
      if (!acc[size]) {
        acc[size] = { total: 0, available: 0 };
      }
      acc[size].total += 1;
      if (!box.isOccupied) {
        acc[size].available += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; available: number }>);

    // Add favorite status if user is logged in
    let isFavorite = false;
    if (session?.user) {
      const favorite = await prisma.userFavorite.findFirst({
        where: {
          userId: session.user.id,
          warehouseId,
        },
      });
      isFavorite = !!favorite;
    }

    // Get current day for opening hours highlight
    const currentDay = new Date().getDay(); // 0-6, 0 is Sunday

    return NextResponse.json({
      data: {
        ...warehouse,
        stats: {
          totalBoxes,
          availableBoxes,
          availabilityPercentage,
          boxesBySize,
        },
        isFavorite,
        currentDay,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching site details:", error);
    return NextResponse.json(
      { error: "Failed to fetch site details" },
      { status: 500 }
    );
  }
} 