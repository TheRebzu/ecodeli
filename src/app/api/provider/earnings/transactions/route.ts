import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";
    const dateRange = searchParams.get("dateRange") || "all";

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const limit = 20;
    const offset = (page - 1) * limit;

    // Calculate date filter
    let dateFilter: any = {};
    const now = new Date();

    switch (dateRange) {
      case "today":
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFilter = { gte: today, lt: tomorrow };
        break;
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { gte: weekAgo };
        break;
      case "month":
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        dateFilter = { gte: monthAgo };
        break;
      case "quarter":
        const quarterAgo = new Date();
        quarterAgo.setDate(quarterAgo.getDate() - 90);
        dateFilter = { gte: quarterAgo };
        break;
    }

    // Build where clause
    const whereClause: any = {
      OR: [
        {
          // Bookings as payment transactions
          service: {
            providerId: provider.id,
          },
          status: "COMPLETED",
        },
      ],
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.scheduledDate = dateFilter;
    }

    // Get bookings as transactions
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            user: {
              select: {
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
        service: {
          select: {
            name: true,
            basePrice: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Transform bookings to transactions
    const transactions = bookings.map((booking) => {
      const amount = booking.totalPrice || booking.service.basePrice || 50;
      const feeAmount = amount * 0.15; // 15% platform fee
      const netAmount = amount - feeAmount;

      const clientName = booking.client.user.profile
        ? `${booking.client.user.profile.firstName || ""} ${booking.client.user.profile.lastName || ""}`.trim()
        : booking.client.user.email.split("@")[0];

      return {
        id: booking.id,
        type: "BOOKING_PAYMENT",
        amount: amount,
        currency: "EUR",
        status: "COMPLETED",
        date: booking.scheduledDate.toISOString(),
        description: `Paiement pour service: ${booking.service.name}`,
        relatedBookingId: booking.id,
        clientName: clientName || "Client",
        serviceName: booking.service.name,
        paymentMethod: "stripe",
        feeAmount: feeAmount,
        netAmount: netAmount,
      };
    });

    // Apply filters
    let filteredTransactions = transactions;

    if (search) {
      filteredTransactions = filteredTransactions.filter(
        (t) =>
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.clientName.toLowerCase().includes(search.toLowerCase()) ||
          t.serviceName.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (status !== "all") {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.status === status,
      );
    }

    if (type !== "all") {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.type === type,
      );
    }

    // Add some mock withdrawal transactions for variety
    if (type === "all" || type === "WITHDRAWAL") {
      const mockWithdrawals = [
        {
          id: "withdrawal-1",
          type: "WITHDRAWAL",
          amount: 500,
          currency: "EUR",
          status: "COMPLETED",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          description: "Retrait vers compte bancaire",
          paymentMethod: "bank_transfer",
          feeAmount: 2.5,
          netAmount: 497.5,
        },
        {
          id: "withdrawal-2",
          type: "WITHDRAWAL",
          amount: 300,
          currency: "EUR",
          status: "PROCESSING",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          description: "Retrait vers compte bancaire",
          paymentMethod: "bank_transfer",
          feeAmount: 2.5,
          netAmount: 297.5,
        },
      ];

      if (
        search === "" ||
        mockWithdrawals.some((w) =>
          w.description.toLowerCase().includes(search.toLowerCase()),
        )
      ) {
        filteredTransactions = [...mockWithdrawals, ...filteredTransactions];
      }
    }

    // Pagination
    const totalTransactions = filteredTransactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);
    const paginatedTransactions = filteredTransactions.slice(0, limit);

    return NextResponse.json({
      transactions: paginatedTransactions,
      totalPages: totalPages,
      currentPage: page,
      totalTransactions: totalTransactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
