import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const validateServiceSchema = z.object({
  providerId: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = validateServiceSchema.parse(body);

    // Vérifier que le service existe et appartient au prestataire
    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        providerId: validatedData.providerId,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or unauthorized" },
        { status: 404 }
      );
    }

    // Vérifier que le service est complet
    if (!service.name || !service.description || !service.basePrice) {
      return NextResponse.json(
        { error: "Service information incomplete" },
        { status: 400 }
      );
    }

    // Mettre à jour le statut de validation
    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: {
        validationStatus: "PENDING",
        validationRequestedAt: new Date(),
      },
    });

    // Créer une notification pour l'admin
    await prisma.notification.create({
      data: {
        userId: validatedData.providerId,
        title: "Demande de validation de service",
        content: `Le service "${service.name}" a été soumis pour validation.`,
        type: "VALIDATION_REQUEST",
        priority: "MEDIUM",
      },
    });

    // Créer une notification pour les admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Nouveau service à valider",
          content: `Le prestataire a soumis le service "${service.name}" pour validation.`,
          type: "ADMIN_TASK",
          priority: "HIGH",
        },
      });
    }

    return NextResponse.json({
      message: "Validation request submitted successfully",
      service: updatedService,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error requesting service validation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 