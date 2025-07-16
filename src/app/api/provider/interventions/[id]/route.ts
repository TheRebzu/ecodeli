import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      console.log('[API] GET intervention: Unauthorized session', session);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: interventionId } = await params;
    console.log('[API] GET intervention: id reçu =', interventionId);

    // Chercher l'intervention par id (et non un booking)
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            service: true,
            review: true,
          },
        },
      },
    });
    console.log('[API] GET intervention: intervention trouvée =', intervention);

    if (!intervention) {
      return NextResponse.json(
        { error: "Intervention not found" },
        { status: 404 },
      );
    }

    // Vérifier que l'intervention appartient au provider courant
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });
    console.log('[API] GET intervention: provider trouvé =', provider);

    if (!provider || intervention.providerId !== provider.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Retourner les infos utiles
    return NextResponse.json({
      id: intervention.id,
      booking: intervention.booking,
      status: intervention.isCompleted ? 'completed' : 'in_progress',
      providerId: intervention.providerId,
      // ... autres champs utiles ...
    });
  } catch (error) {
    console.error("Error fetching intervention:", error);
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
    const user = await requireRole(request, ["PROVIDER"]).catch(() => null);

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: interventionId } = await params;
    const { status, completionReport } = await request.json();

    // Vérifier que l'intervention existe et appartient au prestataire
    const existingIntervention = await prisma.booking.findUnique({
      where: { id: interventionId },
    });

    if (!existingIntervention) {
      return NextResponse.json(
        { error: "Intervention not found" },
        { status: 404 },
      );
    }

    if (existingIntervention.providerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mettre à jour l'intervention
    const updatedIntervention = await prisma.booking.update({
      where: { id: interventionId },
      data: {
        status: status.toUpperCase(),
        completionReport:
          completionReport || existingIntervention.completionReport,
        updatedAt: new Date(),
      },
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
        review: true,
      },
    });

    // Si l'intervention est terminée, créer une notification pour le client
    if (status === "completed") {
      await prisma.notification.create({
        data: {
          userId: updatedIntervention.clientId,
          type: "BOOKING_COMPLETED",
          title: "Intervention terminée",
          message: `Votre intervention "${updatedIntervention.service?.name || "Service"}" a été terminée avec succès.`,
          metadata: {
            bookingId: interventionId,
            providerId: user.id,
          },
        },
      });
    }

    const formattedIntervention = {
      id: updatedIntervention.id,
      title: updatedIntervention.service?.name || "Intervention",
      description: updatedIntervention.notes || "",
      status: updatedIntervention.status.toLowerCase(),
      type: updatedIntervention.service?.category || "Service",
      scheduledDate: updatedIntervention.scheduledDate,
      startTime: updatedIntervention.timeSlot || "09:00",
      endTime: updatedIntervention.endTime || "10:00",
      client: {
        id: updatedIntervention.client.id,
        name:
          `${updatedIntervention.client.user.profile?.firstName || ""} ${updatedIntervention.client.user.profile?.lastName || ""}`.trim() ||
          updatedIntervention.client.email,
        email: updatedIntervention.client.email,
        phone: updatedIntervention.client.user.profile?.phone,
      },
      location: {
        address: updatedIntervention.address || "",
        city: updatedIntervention.city || "",
        zipCode: updatedIntervention.zipCode || "",
      },
      price: Number(updatedIntervention.price) || 0,
      duration: updatedIntervention.duration || 60,
      notes: updatedIntervention.notes,
      completionReport: updatedIntervention.completionReport,
      rating: updatedIntervention.review?.rating,
      createdAt: updatedIntervention.createdAt,
      updatedAt: updatedIntervention.updatedAt,
    };

    return NextResponse.json({ intervention: formattedIntervention });
  } catch (error) {
    console.error("Error updating intervention:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
