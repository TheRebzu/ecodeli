import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params first
    const { id } = await params;

    // Vérifier l'authentification admin
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adminId } = await request.json();

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 400 });
    }

    // Récupérer la livraison
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        deliverer: true,
        announcement: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 },
      );
    }

    // Trouver un nouveau livreur disponible
    const availableDeliverer = await prisma.user.findFirst({
      where: {
        role: "DELIVERER",
        validationStatus: "APPROVED",
        isActive: true,
        deliveries: {
          none: {
            status: {
              in: ["ACCEPTED", "IN_TRANSIT", "PICKING_UP"],
            },
          },
        },
      },
      orderBy: {
        deliveries: {
          _count: "asc",
        },
      },
    });

    if (!availableDeliverer) {
      return NextResponse.json(
        {
          error: "No available deliverer found",
        },
        { status: 404 },
      );
    }

    // Réassigner la livraison
    const updatedDelivery = await prisma.delivery.update({
      where: { id: (await params).id },
      data: {
        delivererId: availableDeliverer.id,
        status: "PENDING",
        reassignedAt: new Date(),
        reassignedBy: adminId,
      },
    });

    // Enregistrer l'action admin
    await prisma.adminAction.create({
      data: {
        adminId,
        action: "REASSIGN_DELIVERY",
        targetUserId: availableDeliverer.id,
        details: {
          deliveryId: (await params).id,
          previousDelivererId: delivery.delivererId,
          newDelivererId: availableDeliverer.id,
          reason: "Admin reassignment",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Delivery reassigned successfully",
      delivery: updatedDelivery,
      newDeliverer: {
        id: availableDeliverer.id,
        name: availableDeliverer.profile?.firstName
          ? `${availableDeliverer.profile.firstName} ${availableDeliverer.profile.lastName}`
          : availableDeliverer.email,
      },
    });
  } catch (error) {
    console.error("Error reassigning delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
