import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DeliveryStatus, OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only merchants can access this endpoint
    if (session.user.role !== "MERCHANT") {
      return NextResponse.json(
        { error: "Access denied. Only merchants can access this dashboard." },
        { status: 403 }
      );
    }

    // Find merchant profile
    const merchant = await prisma.merchant.findFirst({
      where: { userId: session.user.id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant profile not found" },
        { status: 404 }
      );
    }

    // Get time periods for different stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get order statistics
    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      lastMonthOrders,
      thisMonthOrders,
      todayOrders,
      recentOrders
    ] = await Promise.all([
      // Total orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
        },
      }),
      // Completed orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
          status: OrderStatus.COMPLETED,
        },
      }),
      // Pending orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.PROCESSING],
          },
        },
      }),
      // Cancelled orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
          status: OrderStatus.CANCELLED,
        },
      }),
      // Last month orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
          orderDate: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
      // This month orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
          orderDate: {
            gte: thisMonth,
            lte: now,
          },
        },
      }),
      // Today's orders
      prisma.cartDrop.count({
        where: {
          merchantId: merchant.id,
          orderDate: {
            gte: today,
            lte: now,
          },
        },
      }),
      // Recent orders
      prisma.cartDrop.findMany({
        where: {
          merchantId: merchant.id,
        },
        orderBy: {
          orderDate: "desc",
        },
        take: 5,
        include: {
          customer: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          delivery: {
            select: {
              status: true,
              trackingNumber: true,
              estimatedDelivery: true,
              deliveryPerson: {
                select: {
                  user: {
                    select: {
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  price: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Get product statistics
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      topSellingProducts
    ] = await Promise.all([
      // Total products
      prisma.product.count({
        where: {
          merchantId: merchant.id,
        },
      }),
      // Active products
      prisma.product.count({
        where: {
          merchantId: merchant.id,
          isActive: true,
        },
      }),
      // Low stock products
      prisma.product.count({
        where: {
          merchantId: merchant.id,
          isActive: true,
          stock: {
            lte: 10,
          },
        },
      }),
      // Top selling products
      prisma.$queryRaw<Array<{ productId: string, productName: string, totalSold: number, revenue: number }>>`
        SELECT 
          p.id as "productId", 
          p.name as "productName", 
          SUM(ci.quantity) as "totalSold",
          SUM(ci.price * ci.quantity) as "revenue"
        FROM 
          "Product" p
        JOIN 
          "CartItem" ci ON p.id = ci."productId"
        JOIN 
          "CartDrop" cd ON ci."cartId" = cd.id
        WHERE 
          p."merchantId" = ${merchant.id}
          AND cd.status = 'COMPLETED'
        GROUP BY 
          p.id, p.name
        ORDER BY 
          "totalSold" DESC
        LIMIT 5
      `,
    ]);

    // Get revenue statistics
    const [
      totalRevenue,
      lastMonthRevenue,
      thisMonthRevenue,
      dailyRevenue
    ] = await Promise.all([
      // Total revenue
      prisma.payment.aggregate({
        where: {
          merchantId: merchant.id,
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      }),
      // Last month revenue
      prisma.payment.aggregate({
        where: {
          merchantId: merchant.id,
          status: "COMPLETED",
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // This month revenue
      prisma.payment.aggregate({
        where: {
          merchantId: merchant.id,
          status: "COMPLETED",
          createdAt: {
            gte: thisMonth,
            lte: now,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Daily revenue for the last 7 days
      prisma.payment.groupBy({
        by: ["createdAt"],
        where: {
          merchantId: merchant.id,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
            lte: now,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // Get delivery statistics
    const [
      totalDeliveries,
      pendingDeliveries,
      completedDeliveries,
      cancelledDeliveries
    ] = await Promise.all([
      // Total deliveries
      prisma.delivery.count({
        where: {
          merchantId: merchant.id,
        },
      }),
      // Pending deliveries
      prisma.delivery.count({
        where: {
          merchantId: merchant.id,
          status: {
            in: [
              DeliveryStatus.PENDING,
              DeliveryStatus.ACCEPTED,
              DeliveryStatus.PICKUP_SCHEDULED,
              DeliveryStatus.PICKED_UP,
              DeliveryStatus.IN_TRANSIT
            ],
          },
        },
      }),
      // Completed deliveries
      prisma.delivery.count({
        where: {
          merchantId: merchant.id,
          status: DeliveryStatus.DELIVERED,
        },
      }),
      // Cancelled deliveries
      prisma.delivery.count({
        where: {
          merchantId: merchant.id,
          status: DeliveryStatus.CANCELLED,
        },
      }),
    ]);

    // Calculate order growth
    let orderGrowth = 0;
    if (lastMonthOrders > 0) {
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDayOfMonth = now.getDate();
      const projectedMonthlyOrders = (thisMonthOrders / currentDayOfMonth) * daysInCurrentMonth;
      
      orderGrowth = ((projectedMonthlyOrders - lastMonthOrders) / lastMonthOrders) * 100;
    }

    // Calculate revenue growth
    const totalRevenueAmount = totalRevenue._sum.amount || 0;
    const lastMonthRevenueAmount = lastMonthRevenue._sum.amount || 0;
    const thisMonthRevenueAmount = thisMonthRevenue._sum.amount || 0;

    let revenueGrowth = 0;
    if (lastMonthRevenueAmount > 0) {
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDayOfMonth = now.getDate();
      const projectedMonthlyRevenue = (thisMonthRevenueAmount / currentDayOfMonth) * daysInCurrentMonth;
      
      revenueGrowth = ((projectedMonthlyRevenue - lastMonthRevenueAmount) / lastMonthRevenueAmount) * 100;
    }

    // Process daily revenue
    const dailyRevenueData = new Map();
    const last7Days = [];
    
    // Initialize the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString().split('T')[0];
      dailyRevenueData.set(dateString, 0);
      last7Days.push(dateString);
    }
    
    // Fill in actual revenue
    dailyRevenue.forEach(day => {
      const dateString = new Date(day.createdAt).toISOString().split('T')[0];
      const amount = day._sum.amount || 0;
      if (dailyRevenueData.has(dateString)) {
        dailyRevenueData.set(dateString, (dailyRevenueData.get(dateString) || 0) + amount);
      }
    });
    
    // Convert to array for response
    const dailyRevenueArray = last7Days.map(date => ({
      date,
      amount: dailyRevenueData.get(date) || 0,
    }));

    // Get customer statistics
    const [
      totalCustomers,
      newCustomersThisMonth,
      returningCustomers
    ] = await Promise.all([
      // Total unique customers
      prisma.cartDrop.groupBy({
        by: ["customerId"],
        where: {
          merchantId: merchant.id,
        },
        _count: {
          _all: true,
        },
      }).then(result => result.length),
      // New customers this month
      prisma.cartDrop.groupBy({
        by: ["customerId"],
        where: {
          merchantId: merchant.id,
          orderDate: {
            gte: thisMonth,
          },
          NOT: {
            customerId: {
              in: await prisma.cartDrop.findMany({
                where: {
                  merchantId: merchant.id,
                  orderDate: {
                    lt: thisMonth,
                  },
                },
                select: {
                  customerId: true,
                },
              }).then(orders => orders.map(o => o.customerId)),
            },
          },
        },
      }).then(result => result.length),
      // Returning customers (ordered more than once)
      prisma.cartDrop.groupBy({
        by: ["customerId"],
        where: {
          merchantId: merchant.id,
        },
        _count: {
          _all: true,
        },
        having: {
          _all: {
            _count: {
              gt: 1,
            },
          },
        },
      }).then(result => result.length),
    ]);

    // Get wallet balance
    const wallet = await prisma.wallet.findFirst({
      where: {
        merchantId: merchant.id,
      },
      select: {
        balance: true,
        currency: true,
      },
    });

    // Return dashboard data
    return NextResponse.json({
      data: {
        orders: {
          total: totalOrders,
          completed: completedOrders,
          pending: pendingOrders,
          cancelled: cancelledOrders,
          today: todayOrders,
          thisMonth: thisMonthOrders,
          lastMonth: lastMonthOrders,
          growth: Math.round(orderGrowth * 100) / 100,
          recent: recentOrders.map(order => {
            // Calculate order total
            const orderTotal = order.items.reduce(
              (sum, item) => sum + (item.price * item.quantity), 
              0
            );
            
            return {
              id: order.id,
              reference: order.orderReference,
              date: order.orderDate,
              status: order.status,
              total: orderTotal,
              items: order.items.length,
              customerName: order.customer?.user?.name || 'N/A',
              customerEmail: order.customer?.user?.email || 'N/A',
              customerImage: order.customer?.user?.image,
              deliveryStatus: order.delivery?.status || 'Not Scheduled',
              trackingNumber: order.delivery?.trackingNumber || 'N/A',
              estimatedDelivery: order.delivery?.estimatedDelivery,
              deliveryPersonName: order.delivery?.deliveryPerson?.user?.name || 'Not Assigned',
              deliveryPersonPhone: order.delivery?.deliveryPerson?.user?.phone,
            };
          }),
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          lowStock: lowStockProducts,
          topSelling: topSellingProducts.map(product => ({
            id: product.productId,
            name: product.productName,
            totalSold: product.totalSold,
            revenue: product.revenue,
          })),
        },
        revenue: {
          total: totalRevenueAmount,
          thisMonth: thisMonthRevenueAmount,
          lastMonth: lastMonthRevenueAmount,
          growth: Math.round(revenueGrowth * 100) / 100,
          daily: dailyRevenueArray,
          wallet: wallet ? {
            balance: wallet.balance,
            currency: wallet.currency,
          } : { balance: 0, currency: 'USD' },
        },
        deliveries: {
          total: totalDeliveries,
          pending: pendingDeliveries,
          completed: completedDeliveries,
          cancelled: cancelledDeliveries,
          completionRate: totalDeliveries > 0 
            ? Math.round((completedDeliveries / totalDeliveries) * 100) 
            : 0,
        },
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth,
          returning: returningCustomers,
          returnRate: totalCustomers > 0 
            ? Math.round((returningCustomers / totalCustomers) * 100) 
            : 0,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching merchant dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
} 
} 