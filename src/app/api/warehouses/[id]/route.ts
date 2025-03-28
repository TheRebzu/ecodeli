import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schema for updating a warehouse
const updateWarehouseSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  address: z.string().min(5).max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  postalCode: z.string().min(2).max(20).optional(),
  country: z.string().min(2).max(100).optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  capacity: z.number().int().positive().optional(),
  contactPhone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to view warehouse details"
        }
      }, { status: 401 });
    }

    const { id } = params;

    // Fetch the warehouse
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        openingHours: true,
        storageBoxes: {
          select: {
            id: true,
            boxNumber: true,
            size: true,
            isOccupied: true,
            checkInDate: true,
            checkOutDate: true,
            temperature: true,
            humidity: true,
            customerId: true,
            deliveryId: true
          }
        }
      }
    });

    if (!warehouse) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Warehouse not found"
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        warehouse
      }
    });
  } catch (error) {
    console.error("Error fetching warehouse details:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch warehouse details"
      }
    }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to update a warehouse"
        }
      }, { status: 401 });
    }

    // Check admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can update warehouses"
        }
      }, { status: 403 });
    }

    const { id } = params;

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id }
    });

    if (!existingWarehouse) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Warehouse not found"
        }
      }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateWarehouseSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid warehouse data provided",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    // Update the warehouse
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id },
      data: validatedData.data
    });

    // Create an audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "WAREHOUSE",
        entityId: id,
        description: `Updated warehouse: ${updatedWarehouse.name}`
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        warehouse: updatedWarehouse
      }
    });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update warehouse"
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete a warehouse"
        }
      }, { status: 401 });
    }

    // Check admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can delete warehouses"
        }
      }, { status: 403 });
    }

    const { id } = params;

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        storageBoxes: true
      }
    });

    if (!existingWarehouse) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Warehouse not found"
        }
      }, { status: 404 });
    }

    // Check if warehouse has occupied storage boxes
    const hasOccupiedBoxes = existingWarehouse.storageBoxes.some(box => box.isOccupied);
    if (hasOccupiedBoxes) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Cannot delete warehouse with occupied storage boxes"
        }
      }, { status: 409 });
    }

    // Delete all associated data
    await prisma.$transaction([
      prisma.warehouseHour.deleteMany({
        where: { warehouseId: id }
      }),
      prisma.storageBox.deleteMany({
        where: { warehouseId: id }
      }),
      prisma.warehouse.delete({
        where: { id }
      })
    ]);

    // Create an audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "WAREHOUSE",
        entityId: id,
        description: `Deleted warehouse: ${existingWarehouse.name}`
      }
    });

    return NextResponse.json({
      success: true,
      data: null
    });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete warehouse"
      }
    }, { status: 500 });
  }
} 