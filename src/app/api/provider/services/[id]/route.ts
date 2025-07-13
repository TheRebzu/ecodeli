import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateServiceSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  type: z.string().optional(),
  basePrice: z.number().positive().optional(),
  priceUnit: z.enum(["HOUR", "FLAT", "KM", "DAY"]).optional(),
  duration: z.number().optional(),
  isActive: z.boolean().optional(),
  requirements: z.array(z.string()).optional(),
  minAdvanceBooking: z.number().optional(),
  maxAdvanceBooking: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateServiceSchema.parse(body);

    // Vérifier que le service appartient au prestataire
    const service = await prisma.service.findFirst({
      where: {
        id,
        provider: {
          userId: session.user.id,
        },
      },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or unauthorized" },
        { status: 404 },
      );
    }

    // Mettre à jour le service
    const updatedService = await prisma.service.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(updatedService);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que le service appartient au prestataire
    const service = await prisma.service.findFirst({
      where: {
        id,
        provider: {
          userId: session.user.id,
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or unauthorized" },
        { status: 404 },
      );
    }

    // Vérifier qu'il n'y a pas de réservations actives
    const activeBookings = await prisma.booking.count({
      where: {
        serviceId: id,
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
        },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: "Cannot delete service with active bookings" },
        { status: 400 },
      );
    }

    // Désactiver le service au lieu de le supprimer
    const deletedService = await prisma.service.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: "Service deactivated successfully",
      service: deletedService,
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
