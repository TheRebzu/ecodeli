import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createStorageBoxSchema = z.object({
  locationId: z.string(),
  boxNumber: z.string().min(1, "Numéro de box requis"),
  size: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
  pricePerDay: z.number().positive("Prix doit être positif"),
});

const updateStorageBoxSchema = z.object({
  boxNumber: z.string().min(1, "Numéro de box requis"),
  size: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
  pricePerDay: z.number().positive("Prix doit être positif"),
  isAvailable: z.boolean(),
});

// GET - Récupérer toutes les box de stockage
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    const whereClause = locationId ? { locationId } : {};

    const storageBoxes = await prisma.storageBox.findMany({
      where: whereClause,
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
      orderBy: { boxNumber: "asc" },
    });

    return NextResponse.json(storageBoxes);
  } catch (error) {
    console.error("Error fetching storage boxes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Créer une nouvelle box de stockage
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createStorageBoxSchema.parse(body);

    // Vérifier que la location existe
    const location = await prisma.location.findUnique({
      where: { id: validatedData.locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location non trouvée" },
        { status: 404 },
      );
    }

    // Vérifier que le numéro de box n'existe pas déjà pour cette location
    const existingBox = await prisma.storageBox.findFirst({
      where: {
        locationId: validatedData.locationId,
        boxNumber: validatedData.boxNumber,
      },
    });

    if (existingBox) {
      return NextResponse.json(
        { error: "Une box avec ce numéro existe déjà" },
        { status: 409 },
      );
    }

    const storageBox = await prisma.storageBox.create({
      data: {
        locationId: validatedData.locationId,
        boxNumber: validatedData.boxNumber,
        size: validatedData.size,
        pricePerDay: validatedData.pricePerDay,
        isAvailable: true,
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

    return NextResponse.json(storageBox, { status: 201 });
  } catch (error) {
    console.error("Error creating storage box:", error);

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