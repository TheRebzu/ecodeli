import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { StorageBoxService } from "@/features/storage/services/storage-box.service";

const extendSchema = z.object({
  newEndDate: z.string().datetime(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PUT - Prolonger une location de box
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client non trouvé" },
        { status: 404 },
      );
    }

    // Vérifier que la location appartient au client
    const rental = await prisma.storageBoxRental.findFirst({
      where: {
        id,
        clientId: client.id,
      },
    });

    if (!rental) {
      return NextResponse.json(
        { error: "Location non trouvée" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validatedData = extendSchema.parse(body);

    const updatedRental = await StorageBoxService.extendRental(
      id,
      new Date(validatedData.newEndDate),
    );

    return NextResponse.json({
      success: true,
      message: "Location prolongée avec succès",
      rental: updatedRental,
    });
  } catch (error) {
    console.error("Error extending rental:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la prolongation de la location" },
      { status: 500 },
    );
  }
}
