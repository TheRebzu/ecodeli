import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BoxSize } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  city: z.string().optional(),
  postalCode: z.string().optional(),
  size: z.nativeEnum(BoxSize).optional(),
  date: z.string().optional(), // ISO date string for availability check
});

// GET: Check availability of storage boxes
export async function GET(req: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      city: searchParams.get("city"),
      postalCode: searchParams.get("postalCode"),
      size: searchParams.get("size"),
      date: searchParams.get("date"),
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { city, postalCode, size, date } = validatedParams.data;

    // Build query for warehouses
    const warehouseWhereClause: {
      isActive: boolean;
      city?: string;
      postalCode?: string;
    } = {
      isActive: true,
    };

    if (city) {
      warehouseWhereClause.city = city;
    }

    if (postalCode) {
      warehouseWhereClause.postalCode = postalCode;
    }

    // Find active warehouses
    const warehouses = await prisma.warehouse.findMany({
      where: warehouseWhereClause,
      include: {
        openingHours: true,
      },
    });

    // Build query for storage boxes
    const boxWhereClause: {
      warehouseId: {
        in: string[];
      };
      isOccupied: boolean;
      size?: BoxSize;
    } = {
      warehouseId: {
        in: warehouses.map((w) => w.id),
      },
      isOccupied: false,
    };

    if (size) {
      boxWhereClause.size = size as BoxSize;
    }

    // Find available boxes
    const availableBoxes = await prisma.storageBox.findMany({
      where: boxWhereClause,
      select: {
        id: true,
        warehouseId: true,
        size: true,
        temperature: true,
        humidity: true,
      },
    });

    // Organize data by warehouse
    const warehousesWithAvailability = warehouses.map((warehouse) => {
      const warehouseBoxes = availableBoxes.filter(
        (box) => box.warehouseId === warehouse.id
      );

      // Count available boxes by size
      const availabilityBySize = Object.values(BoxSize).reduce((acc, boxSize) => {
        acc[boxSize] = warehouseBoxes.filter((box) => box.size === boxSize).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        id: warehouse.id,
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city,
        postalCode: warehouse.postalCode,
        coordinates: warehouse.coordinates,
        totalAvailable: warehouseBoxes.length,
        availabilityBySize,
        openingHours: warehouse.openingHours,
      };
    });

    // Sort by total availability (most available first)
    warehousesWithAvailability.sort((a, b) => b.totalAvailable - a.totalAvailable);

    return NextResponse.json({
      data: warehousesWithAvailability,
      meta: {
        totalWarehouses: warehouses.length,
        totalAvailableBoxes: availableBoxes.length,
        date: date || new Date().toISOString().split("T")[0],
        filters: {
          city,
          postalCode,
          size,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error checking warehouse availability:", error);
    return NextResponse.json(
      { error: "Failed to check warehouse availability" },
      { status: 500 }
    );
  }
} 