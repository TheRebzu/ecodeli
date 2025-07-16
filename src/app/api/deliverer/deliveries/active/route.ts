import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(
      "🔍 Recherche livraisons actives pour livreur:",
      session.user.id,
    );

    // Récupérer les livraisons actives du livreur
    const activeDeliveries = await db.delivery.findMany({
      where: {
        delivererId: session.user.id,
        status: {
          in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"],
        },
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            amount: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log("📦 Livraisons actives trouvées:", activeDeliveries.length);
    activeDeliveries.forEach((delivery) => {
      console.log(`  - ${delivery.id}: ${delivery.status}`);
    });

    // Debug: Vérifier toutes les livraisons du livreur
    const allDeliveries = await db.delivery.findMany({
      where: {
        delivererId: session.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });
    console.log("🔍 Toutes les livraisons du livreur:", allDeliveries.length);
    allDeliveries.forEach((delivery) => {
      console.log(`  - ${delivery.id}: ${delivery.status}`);
    });

    // Formatter les données pour le frontend
    const formattedDeliveries = await Promise.all(activeDeliveries.map(async (delivery) => {
      let payment = delivery.payment
      if (!payment) {
        // Try to find payment by announcement if not linked to delivery
        payment = await db.payment.findFirst({
          where: {
            announcementId: delivery.announcement.id,
            type: "DELIVERY",
          },
          select: {
            status: true,
            amount: true,
            paidAt: true,
          },
        });
      }
      return {
        id: delivery.id,
        announcement: {
          id: delivery.announcement.id,
          title: delivery.announcement.title,
          description: delivery.announcement.description,
          type: delivery.announcement.type,
        },
        pickupAddress: delivery.announcement.pickupAddress,
        deliveryAddress: delivery.announcement.deliveryAddress,
        scheduledPickupDate: delivery.pickupDate,
        scheduledDeliveryDate: delivery.deliveryDate,
        actualPickupDate: delivery.actualPickupDate,
        actualDeliveryDate: delivery.actualDeliveryDate,
        status: delivery.status,
        price: delivery.price,
        validationCode: delivery.validationCode,
        client: {
          id: delivery.announcement.author.id,
          firstName: delivery.announcement.author.profile?.firstName || "",
          lastName: delivery.announcement.author.profile?.lastName || "",
          phone: delivery.announcement.author.profile?.phone || "",
        },
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
        payment: payment
          ? {
              status: payment.status,
              amount: payment.amount,
              paidAt: payment.paidAt,
            }
          : null,
      };
    }));

    return NextResponse.json({
      success: true,
      data: formattedDeliveries,
      count: formattedDeliveries.length,
    });
  } catch (error) {
    console.error("Error fetching active deliveries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
