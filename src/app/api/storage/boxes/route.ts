import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

// GET - Récupérer les box de stockage disponibles
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    const size = searchParams.get("size");
    const status = searchParams.get("status") || "AVAILABLE";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Construire les conditions de filtrage
    const whereConditions: any = {};

    if (warehouseId) {
      whereConditions.warehouseId = warehouseId;
    }

    if (size) {
      whereConditions.size = size;
    }

    if (status) {
      whereConditions.status = status;
    }

    // Récupérer les box avec les informations de l'entrepôt
    const [boxes, total] = await Promise.all([
      prisma.storageBox.findMany({
        where: whereConditions,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
        },
        orderBy: {
          number: "asc",
        },
        skip,
        take: limit,
      }),
      prisma.storageBox.count({
        where: whereConditions,
      }),
    ]);

    return NextResponse.json({
      boxes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching storage boxes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create a new storage box (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admin users can create storage boxes" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { warehouseId, number, size, monthlyPrice } = body;

    // Validate required fields
    if (!warehouseId || !number || !size || !monthlyPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if box number already exists in the warehouse
    const existingBox = await prisma.storageBox.findFirst({
      where: {
        warehouseId,
        number,
      },
    });

    if (existingBox) {
      return NextResponse.json(
        { error: "Box number already exists in this warehouse" },
        { status: 409 },
      );
    }

    const box = await prisma.storageBox.create({
      data: {
        warehouseId,
        number,
        size,
        monthlyPrice,
        status: "AVAILABLE",
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    return NextResponse.json(box, { status: 201 });
  } catch (error) {
    console.error("Error creating storage box:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
