import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateServiceInterventionSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED", 
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  notes: z.string().optional(),
  actualDuration: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: interventionId } = await params;

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            service: true,
            payment: true,
          },
        },
        provider: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        invoiceItems: true,
      },
    });

    if (!intervention) {
      return NextResponse.json(
        { error: "Service intervention not found" },
        { status: 404 },
      );
    }

    // Vérifier que l'intervention appartient au provider
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider || intervention.providerId !== provider.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ intervention });
  } catch (error) {
    console.error("Error fetching service intervention:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: interventionId } = await params;
    const body = await request.json();
    const validatedData = updateServiceInterventionSchema.parse(body);

    // Vérifier que l'intervention existe et appartient au prestataire
    const existingIntervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        booking: {
          include: {
            client: true,
            service: true,
            payment: true,
          },
        },
        provider: {
          include: {
            user: true,
          },
        },
        invoiceItems: true,
      },
    });

    if (!existingIntervention) {
      return NextResponse.json(
        { error: "Service intervention not found" },
        { status: 404 },
      );
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider || existingIntervention.providerId !== provider.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Vérifier les transitions de statut autorisées
    const allowedTransitions = {
      PENDING: ["CONFIRMED", "IN_PROGRESS", "CANCELLED"],
      CONFIRMED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: ["COMPLETED"], // Permet de rester COMPLETED
      CANCELLED: ["CANCELLED"], // Permet de rester CANCELLED
    };

    const currentStatus = existingIntervention.booking.status;
    const newStatus = validatedData.status;

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Transition non autorisée de ${currentStatus} vers ${newStatus}`,
        },
        { status: 400 },
      );
    }

    // Mettre à jour l'intervention et le booking
    const interventionUpdateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.notes !== undefined) {
      interventionUpdateData.report = validatedData.notes;
    }

    if (validatedData.actualDuration !== undefined) {
      interventionUpdateData.actualDuration = validatedData.actualDuration;
    }

    // Si l'intervention démarre, mettre à jour le timestamp de début
    if (validatedData.status === "IN_PROGRESS" && !existingIntervention.startTime) {
      interventionUpdateData.startTime = new Date();
    }

    // Si l'intervention est terminée, mettre à jour les timestamps
    if (validatedData.status === "COMPLETED") {
      interventionUpdateData.isCompleted = true;
      interventionUpdateData.completedAt = new Date();
      if (!existingIntervention.endTime) {
        interventionUpdateData.endTime = new Date();
      }
      // Si l'intervention n'avait pas de startTime, l'ajouter maintenant
      if (!existingIntervention.startTime) {
        interventionUpdateData.startTime = new Date(Date.now() - (validatedData.actualDuration || 60) * 60 * 1000);
      }
    }

    // Mettre à jour le statut du booking
    await prisma.booking.update({
      where: { id: existingIntervention.bookingId },
      data: { status: validatedData.status },
    });

    // Si l'intervention est annulée, annuler le paiement
    if (
      validatedData.status === "CANCELLED" &&
      existingIntervention.booking.payment?.id
    ) {
      await prisma.payment.update({
        where: { id: existingIntervention.booking.payment.id },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
          metadata: {
            ...existingIntervention.booking.payment?.metadata,
            cancelledBy: session.user.id,
            cancelledAt: new Date().toISOString(),
            reason: "Service intervention cancelled",
          },
        },
      });

      // Créer une notification pour le client
      await prisma.notification.create({
        data: {
          userId: existingIntervention.booking.clientId,
          type: "SERVICE_CANCELLED",
          title: "Service annulé",
          message: `Votre service "${existingIntervention.booking.service.name}" a été annulé. Le remboursement sera traité.`,
          data: {
            interventionId: interventionId,
            paymentId: existingIntervention.booking.payment.id,
            refundAmount: existingIntervention.booking.payment?.amount,
          },
        },
      });
    }

    // Si l'intervention est terminée, débloquer le paiement
    if (
      validatedData.status === "COMPLETED" &&
      existingIntervention.booking.payment?.id
    ) {
      await prisma.payment.update({
        where: { id: existingIntervention.booking.payment.id },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          metadata: {
            ...existingIntervention.booking.payment?.metadata,
            completedAt: new Date().toISOString(),
            actualDuration: validatedData.actualDuration,
          },
        },
      });

      // Créer une notification pour le client
      await prisma.notification.create({
        data: {
          userId: existingIntervention.booking.clientId,
          type: "SERVICE_COMPLETED",
          title: "Service terminé",
          message: `Votre service "${existingIntervention.booking.service.name}" a été terminé avec succès.`,
          data: {
            interventionId: interventionId,
            paymentId: existingIntervention.booking.payment.id,
          },
        },
      });
    }

    // Si l'intervention passe en cours, créer une notification
    if (validatedData.status === "IN_PROGRESS") {
      await prisma.notification.create({
        data: {
          userId: existingIntervention.booking.clientId,
          type: "SERVICE_STARTED",
          title: "Service commencé",
          message: `Votre prestataire a commencé le service "${existingIntervention.booking.service.name}".`,
          data: {
            interventionId: interventionId,
            providerId: provider.id,
          },
        },
      });
    }

    const updatedIntervention = await prisma.intervention.update({
      where: { id: interventionId },
      data: interventionUpdateData,
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            service: true,
            payment: true,
          },
        },
        provider: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        invoiceItems: true,
      },
    });

    return NextResponse.json({
      success: true,
      intervention: updatedIntervention,
      message: `Intervention ${validatedData.status.toLowerCase()} avec succès`,
    });
  } catch (error) {
    console.error("Error updating service intervention:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
