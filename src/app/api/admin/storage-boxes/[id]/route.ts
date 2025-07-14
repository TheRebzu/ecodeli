import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateStorageBoxSchema = z.object({
  boxNumber: z.string().min(1, "Numéro de box requis"),
  size: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
  pricePerDay: z.number().positive("Prix doit être positif"),
  isAvailable: z.boolean(),
});

// GET - Récupérer une box spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const storageBox = await prisma.storageBox.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        rentals: {
          include: {
            client: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!storageBox) {
      return NextResponse.json(
        { error: "Box de stockage non trouvée" },
        { status: 404 },
      );
    }

    return NextResponse.json(storageBox);
  } catch (error) {
    console.error("Error fetching storage box:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Modifier une box de stockage
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateStorageBoxSchema.parse(body);

    // Vérifier que la box existe
    const existingBox = await prisma.storageBox.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!existingBox) {
      return NextResponse.json(
        { error: "Box de stockage non trouvée" },
        { status: 404 },
      );
    }

    // Vérifier que le numéro de box n'existe pas déjà pour cette location
    if (validatedData.boxNumber !== existingBox.boxNumber) {
      const duplicateBox = await prisma.storageBox.findFirst({
        where: {
          locationId: existingBox.locationId,
          boxNumber: validatedData.boxNumber,
          id: { not: id },
        },
      });

      if (duplicateBox) {
        return NextResponse.json(
          { error: "Une box avec ce numéro existe déjà" },
          { status: 409 },
        );
      }
    }

    const updatedBox = await prisma.storageBox.update({
      where: { id },
      data: {
        boxNumber: validatedData.boxNumber,
        size: validatedData.size,
        pricePerDay: validatedData.pricePerDay,
        isAvailable: validatedData.isAvailable,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBox);
  } catch (error) {
    console.error("Error updating storage box:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Supprimer une box de stockage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que la box existe
    const existingBox = await prisma.storageBox.findUnique({
      where: { id },
      include: {
        rentals: {
          where: {
            OR: [
              { endDate: null },
              { endDate: { gt: new Date() } },
            ],
          },
        },
      },
    });

    if (!existingBox) {
      return NextResponse.json(
        { error: "Box de stockage non trouvée" },
        { status: 404 },
      );
    }

    // Vérifier s'il y a des locations actives
    if (existingBox.rentals.length > 0) {
      return NextResponse.json(
        {
          error: "Impossible de supprimer cette box car elle a des locations actives",
          activeRentalsCount: existingBox.rentals.length,
        },
        { status: 400 },
      );
    }

    // Supprimer la box
    await prisma.storageBox.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Box de stockage supprimée avec succès",
    });
  } catch (error) {
    console.error("Error deleting storage box:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
} 