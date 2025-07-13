import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/utils/api-response";

// Schema de validation pour mise à jour de route
const updateRouteSchema = z.object({
  isActive: z.boolean().optional(),
  startLocation: z.string().min(5).optional(),
  endLocation: z.string().min(5).optional(),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  daysOfWeek: z.array(z.string()).optional(),
  vehicleType: z
    .enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "WALKING"])
    .optional(),
  maxDistance: z.number().min(1).max(50).optional(),
  minPrice: z.number().min(5).max(100).optional(),
});

// GET - Récupérer une route spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer profile not found" },
        { status: 404 },
      );
    }

    const { id } = await params;
    const route = await prisma.route.findFirst({
      where: {
        id: id,
        delivererId: deliverer.id,
      },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error) {
    return handleApiError(error, "fetching route");
  }
}

// PUT - Mettre à jour une route
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateRouteSchema.parse(body);

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer profile not found" },
        { status: 404 },
      );
    }

    // Vérifier que la route appartient au livreur
    const { id } = await params;
    const existingRoute = await prisma.route.findFirst({
      where: {
        id: id,
        delivererId: deliverer.id,
      },
    });

    if (!existingRoute) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const updatedRoute = await prisma.route.update({
      where: { id: id },
      data: validatedData,
    });

    return NextResponse.json(updatedRoute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    return handleApiError(error, "updating route");
  }
}

// DELETE - Supprimer une route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Deliverer profile not found" },
        { status: 404 },
      );
    }

    // Vérifier que la route appartient au livreur
    const { id } = await params;
    const existingRoute = await prisma.route.findFirst({
      where: {
        id: id,
        delivererId: deliverer.id,
      },
    });

    if (!existingRoute) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    await prisma.route.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Route deleted successfully" });
  } catch (error) {
    return handleApiError(error, "deleting route");
  }
}
