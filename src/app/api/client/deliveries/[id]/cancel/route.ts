import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Cancellation reason required" },
        { status: 400 },
      );
    }

    // Récupérer la livraison
    const { id } = await params;
    const delivery = await db.delivery.findFirst({
      where: {
        id: id,
        announcement: {
          clientId: session.user.id,
        },
      },
      include: {
        announcement: true,
        deliverer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 },
      );
    }

    // V�rifier que la livraison peut �tre annul�e
    if (delivery.status === "CANCELLED" || delivery.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Delivery cannot be cancelled" },
        { status: 400 },
      );
    }

    // Calculer les frais d'annulation si applicable
    const scheduledDate = delivery.scheduledDate
      ? new Date(delivery.scheduledDate)
      : new Date();
    const now = new Date();
    const hoursUntilDelivery =
      (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let cancellationFee = 0;
    if (delivery.status === "IN_PROGRESS") {
      cancellationFee = delivery.announcement.price * 0.5; // 50% si livraison en cours
    } else if (delivery.status === "ACCEPTED" && hoursUntilDelivery < 24) {
      cancellationFee = delivery.announcement.price * 0.25; // 25% si annulation moins de 24h avant
    }

    // Transaction pour annuler la livraison
    await db.$transaction(async (tx) => {
      // Mettre à jour la livraison
      await tx.delivery.update({
        where: { id: id },
        data: {
          status: "CANCELLED",
          cancelReason: reason.trim(),
          cancelledAt: new Date(),
          cancellationFee,
        },
      });

      // Remettre l'annonce en mode ACTIVE si elle �tait en cours
      if (delivery.announcement.status === "IN_PROGRESS") {
        await tx.announcement.update({
          where: { id: delivery.announcementId },
          data: {
            status: "ACTIVE",
          },
        });
      }

      // Lib�rer le livreur si assign�
      if (delivery.delivererId) {
        // Notification pour le livreur
        await tx.notification.create({
          data: {
            userId: delivery.deliverer!.userId,
            type: "DELIVERY_CANCELLED",
            title: "Livraison annul�e",
            message: `Le client a annul� la livraison "${delivery.announcement.title}". Raison: ${reason.trim()}`,
            status: "UNREAD",
          },
        });
      }

      // Si frais d'annulation, cr�er un paiement
      if (cancellationFee > 0) {
        await tx.payment.create({
          data: {
            deliveryId: delivery.id,
            payerId: session.user.id,
            recipientId: delivery.delivererId || "system",
            amount: cancellationFee,
            currency: "EUR",
            type: "CANCELLATION_FEE",
            status: "PENDING",
            description: `Frais d'annulation pour: ${delivery.announcement.title}`,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      cancellationFee,
      message:
        cancellationFee > 0
          ? `Livraison annul�e. Frais d'annulation: ${cancellationFee}�`
          : "Livraison annul�e sans frais",
    });
  } catch (error) {
    console.error("Error cancelling delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
