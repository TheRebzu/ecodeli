import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BoxSize } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  warehouseId: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  size: z.nativeEnum(BoxSize).optional(),
  temperature: z.enum(["AMBIENT", "REFRIGERATED", "FROZEN"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Helper function to determine temperature category
function getTemperatureCategory(temp: number | null): "AMBIENT" | "REFRIGERATED" | "FROZEN" {
  if (temp === null) return "AMBIENT";
  if (temp <= -5) return "FROZEN";
  if (temp <= 8) return "REFRIGERATED";
  return "AMBIENT";
}

// GET: Check storage box availability
export async function GET(req: NextRequest) {
  try {
    // Authentication is not required for checking availability
    
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      warehouseId: searchParams.get("warehouseId"),
      city: searchParams.get("city"),
      postalCode: searchParams.get("postalCode"),
      size: searchParams.get("size"),
      temperature: searchParams.get("temperature"),
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { warehouseId, city, postalCode, size, temperature, page, limit } = validatedParams.data;
    const skip = (page - 1) * limit;

    // Build warehouse query
    const warehouseWhereClause: {
      id?: string;
      city?: string;
      postalCode?: string;
      isActive: boolean;
    } = {
      isActive: true,
    };

    if (warehouseId) {
      warehouseWhereClause.id = warehouseId;
    } else if (city) {
      warehouseWhereClause.city = city;
      if (postalCode) {
        warehouseWhereClause.postalCode = postalCode;
      }
    }

    // Find warehouses matching criteria
    const warehouses = await prisma.warehouse.findMany({
      where: warehouseWhereClause,
      include: {
        openingHours: true,
      },
    });

    if (warehouses.length === 0) {
      return NextResponse.json({
        data: [],
        meta: {
          pagination: {
            currentPage: page,
            pageSize: limit,
            totalPages: 0,
            totalCount: 0,
          },
          filters: {
            warehouseId,
            city,
            postalCode,
            size,
            temperature,
          },
        },
      });
    }

    // Build storage box query
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
      boxWhereClause.size = size;
    }

    // Find available boxes
    let availableBoxes = await prisma.storageBox.findMany({
      where: boxWhereClause,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            postalCode: true,
            coordinates: true,
          },
        },
      },
      orderBy: {
        size: "asc",
      },
      skip,
      take: limit,
    });

    // Apply temperature filter if specified
    if (temperature) {
      availableBoxes = availableBoxes.filter(box => {
        return getTemperatureCategory(box.temperature) === temperature;
      });
    }

    // Count total matching boxes for pagination
    const totalCount = await prisma.storageBox.count({
      where: boxWhereClause,
    });

    // Get pricing information (normally from database)
    const pricing = {
      SMALL: { hourly: 2, daily: 15, weekly: 80, monthly: 250 },
      MEDIUM: { hourly: 3, daily: 20, weekly: 120, monthly: 350 },
      LARGE: { hourly: 5, daily: 30, weekly: 180, monthly: 500 },
      EXTRA_LARGE: { hourly: 8, daily: 45, weekly: 250, monthly: 750 },
    };

    // Enhance boxes with pricing
    const boxesWithPricing = availableBoxes.map(box => ({
      ...box,
      pricing: pricing[box.size],
      temperatureCategory: getTemperatureCategory(box.temperature),
    }));

    return NextResponse.json({
      data: boxesWithPricing,
      meta: {
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        },
        filters: {
          warehouseId,
          city,
          postalCode,
          size,
          temperature,
        },
        warehousesCount: warehouses.length,
      },
    });
  } catch (error: unknown) {
    console.error("Error checking storage box availability:", error);
    return NextResponse.json(
      { error: "Failed to check storage box availability" },
      { status: 500 }
    );
  }
} 