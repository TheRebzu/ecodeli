import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BoxSize } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const warehouseId = params.id;

    // Fetch the warehouse with details
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        openingHours: true,
        nfcTerminals: {
          select: {
            id: true,
            serialNumber: true,
            location: true,
            status: true,
            lastPing: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Get box statistics
    const boxStats = await prisma.$queryRaw<BoxStatistics[]>`
      SELECT 
        size as "boxSize", 
        COUNT(*) as "total",
        SUM(CASE WHEN "isOccupied" = true THEN 1 ELSE 0 END) as "occupied",
        SUM(CASE WHEN "isOccupied" = false THEN 1 ELSE 0 END) as "available"
      FROM "StorageBox"
      WHERE "warehouseId" = ${warehouseId}
      GROUP BY size
    `;

    // Get recent box assignments and releases
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        entityType: "STORAGE_BOX",
        OR: [
          { action: "RESERVE" },
          { action: "RELEASE" },
        ],
        details: {
          contains: warehouse.name,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Get boxes with temperature control
    const temperatureControlledBoxes = await prisma.storageBox.findMany({
      where: {
        warehouseId,
        temperature: { not: null },
      },
      select: {
        id: true,
        boxNumber: true,
        temperature: true,
        humidity: true,
        isOccupied: true,
        size: true,
      },
    });

    // Format opening hours
    const formattedOpeningHours = formatOpeningHours(warehouse.openingHours);

    // Prepare the response
    return NextResponse.json({
      data: {
        ...warehouse,
        openingHours: formattedOpeningHours,
        currentlyOpen: isWarehouseOpen(warehouse.openingHours),
        boxStatistics: boxStats,
        boxStatsBySize: createBoxStatsBySize(boxStats),
        usagePercentage: calculateUsagePercentage(warehouse),
        recentActivity,
        temperatureControlledBoxes,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching warehouse details:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse details" },
      { status: 500 }
    );
  }
}

/**
 * Check if the warehouse is currently open based on its opening hours
 */
function isWarehouseOpen(openingHours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>) {
  if (!openingHours || openingHours.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0-6, 0 is Sunday
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const todayHours = openingHours.find(hours => hours.dayOfWeek === currentDay);
  
  if (!todayHours || todayHours.isClosed) {
    return false;
  }
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
}

/**
 * Format opening hours into a human-readable format
 */
function formatOpeningHours(
  openingHours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>
) {
  if (!openingHours || openingHours.length === 0) {
    return [];
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  return openingHours
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(hours => ({
      day: dayNames[hours.dayOfWeek],
      hours: hours.isClosed ? "Closed" : `${hours.openTime} - ${hours.closeTime}`,
      isClosed: hours.isClosed,
    }));
}

/**
 * Calculate the overall warehouse usage percentage
 */
function calculateUsagePercentage(warehouse: { capacity: number; availableBoxes: number }) {
  return warehouse.capacity > 0 
    ? Math.round(((warehouse.capacity - warehouse.availableBoxes) / warehouse.capacity) * 100) 
    : 0;
}

/**
 * Create box statistics by size
 */
function createBoxStatsBySize(boxStats: BoxStatistics[]) {
  const result: Record<string, { total: number; occupied: number; available: number }> = {
    SMALL: { total: 0, occupied: 0, available: 0 },
    MEDIUM: { total: 0, occupied: 0, available: 0 },
    LARGE: { total: 0, occupied: 0, available: 0 },
  };
  
  boxStats.forEach(stat => {
    if (stat.boxSize in result) {
      result[stat.boxSize] = {
        total: Number(stat.total),
        occupied: Number(stat.occupied),
        available: Number(stat.available),
      };
    }
  });
  
  return result;
}

// Type for box statistics from raw query
interface BoxStatistics {
  boxSize: BoxSize;
  total: bigint;
  occupied: bigint;
  available: bigint;
} 