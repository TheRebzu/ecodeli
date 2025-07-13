import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch customers who have ordered from this merchant
    const customers = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        deliveries: {
          some: {
            announcement: {
              authorId: user.id,
            },
          },
        },
      },
      include: {
        profile: true,
        deliveries: {
          where: {
            announcement: {
              authorId: user.id,
            },
          },
          include: {
            payment: true,
            announcement: true,
          },
        },
      },
    });

    // Process customer data
    const processedCustomers = customers.map((customer) => {
      const totalOrders = customer.deliveries.length;
      const totalSpent = customer.deliveries.reduce(
        (sum, delivery) =>
          sum + (delivery.payment ? Number(delivery.payment.amount) : 0),
        0,
      );
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Find last order date
      const lastOrder = customer.deliveries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      // Calculate loyalty tier based on total spent
      let loyaltyTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
      if (totalSpent >= 1000) loyaltyTier = "PLATINUM";
      else if (totalSpent >= 500) loyaltyTier = "GOLD";
      else if (totalSpent >= 200) loyaltyTier = "SILVER";

      // Determine status
      let status: "ACTIVE" | "INACTIVE" | "VIP" = "ACTIVE";
      if (totalSpent >= 2000) status = "VIP";
      else if (
        lastOrder &&
        new Date().getTime() - new Date(lastOrder.createdAt).getTime() >
          90 * 24 * 60 * 60 * 1000
      ) {
        status = "INACTIVE";
      }

      return {
        id: customer.id,
        email: customer.email,
        profile: customer.profile,
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder?.createdAt || null,
        averageOrderValue,
        customerSince: customer.createdAt,
        loyaltyTier,
        status,
      };
    });

    return NextResponse.json({
      customers: processedCustomers,
      total: processedCustomers.length,
      active: processedCustomers.filter((c) => c.status === "ACTIVE").length,
      vip: processedCustomers.filter((c) => c.status === "VIP").length,
    });
  } catch (error) {
    console.error("Error fetching merchant customers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
