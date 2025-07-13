import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString(),
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString(),
    );

    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        contract: true,
        announcements: {
          include: {
            delivery: {
              where: {
                status: "DELIVERED",
                actualDeliveryDate: {
                  gte: new Date(year, month - 1, 1),
                  lt: new Date(year, month, 1),
                },
              },
            },
          },
        },
      },
    });

    if (!merchant || !merchant.contract) {
      return NextResponse.json({
        success: true,
        billing: {
          period: `${month.toString().padStart(2, "0")}/${year}`,
          totalOrders: 0,
          totalRevenue: 0,
          commission: 0,
          netAmount: 0,
          commissionRate: 15.0,
          details: [],
        },
      });
    }

    // Calculer les statistiques de facturation
    let totalOrders = 0;
    let totalRevenue = 0;
    const details: any[] = [];

    merchant.announcements.forEach((announcement) => {
      const delivery = announcement.delivery;
      if (delivery && delivery.status === "DELIVERED" && delivery.price) {
        totalOrders++;
        const revenue = parseFloat(delivery.price.toString());
        totalRevenue += revenue;
        details.push({
          id: delivery.id,
          announcementTitle: announcement.title,
          deliveryDate: delivery.actualDeliveryDate,
          amount: revenue,
          commission: revenue * (merchant.contract!.commissionRate / 100),
        });
      }
    });

    const commissionRate = merchant.contract.commissionRate;
    const commission = totalRevenue * (commissionRate / 100);
    const netAmount = totalRevenue - commission;

    return NextResponse.json({
      success: true,
      billing: {
        period: `${month.toString().padStart(2, "0")}/${year}`,
        totalOrders,
        totalRevenue,
        commission,
        netAmount,
        commissionRate,
        details,
      },
    });
  } catch (error) {
    console.error("❌ Erreur récupération facturation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
