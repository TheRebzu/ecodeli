import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Export request schema
const exportRequestSchema = z.object({
  reportType: z.enum(["revenue", "activity", "deliveries", "users", "orders", "custom"]),
  format: z.enum(["csv", "pdf", "excel"]),
  timeframe: z.object({
    startDate: z.string().refine(
      value => !isNaN(Date.parse(value)),
      { message: "Invalid start date format" }
    ),
    endDate: z.string().refine(
      value => !isNaN(Date.parse(value)),
      { message: "Invalid end date format" }
    ),
  }),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()).optional(),
  includeCharts: z.boolean().default(false),
  chartType: z.enum(["line", "bar", "pie"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// Type for export request
type ExportRequest = z.infer<typeof exportRequestSchema>;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user and check admin rights
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and specific roles can export data
    const allowedRoles = ["ADMIN", "SUPERADMIN", "MERCHANT", "DELIVERY_PERSON"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "You don't have permission to export reports" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const exportRequest = exportRequestSchema.parse(body);

    // Get report data based on report type
    const reportData = await getReportData(exportRequest, session.user);

    // Generate export based on format
    const exportResult = await generateExport(reportData, exportRequest);

    // Create export record in database
    const exportRecord = await prisma.reportExport.create({
      data: {
        userId: session.user.id,
        reportType: exportRequest.reportType,
        format: exportRequest.format,
        fileUrl: exportResult.fileUrl,
        fileName: exportResult.fileName,
        createdAt: new Date(),
        filters: exportRequest.filters || {},
      },
    });

    // Return export information
    return NextResponse.json({
      data: {
        id: exportRecord.id,
        fileUrl: exportResult.fileUrl,
        fileName: exportResult.fileName,
        format: exportRequest.format,
        reportType: exportRequest.reportType,
        createdAt: exportRecord.createdAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error exporting report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}

// Function to get report data based on report type
async function getReportData(exportRequest: ExportRequest, user: any): Promise<any> {
  const { reportType, timeframe, filters } = exportRequest;
  const startDate = new Date(timeframe.startDate);
  const endDate = new Date(timeframe.endDate);

  // Different logic based on report type
  switch (reportType) {
    case "revenue":
      return getRevenueReportData(startDate, endDate, filters, user);
    case "activity":
      return getActivityReportData(startDate, endDate, filters, user);
    case "deliveries":
      return getDeliveriesReportData(startDate, endDate, filters, user);
    case "users":
      return getUsersReportData(startDate, endDate, filters, user);
    case "orders":
      return getOrdersReportData(startDate, endDate, filters, user);
    case "custom":
      return getCustomReportData(startDate, endDate, filters, user);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

// Helper function to get revenue report data
async function getRevenueReportData(
  startDate: Date,
  endDate: Date,
  filters: Record<string, any> = {},
  user: any
): Promise<any[]> {
  // Basic where clause for payments
  const whereClause: Record<string, any> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    status: "COMPLETED",
  };

  // Apply filters based on user role
  if (user.role === "MERCHANT") {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: user.id },
    });
    
    if (!merchant) {
      throw new Error("Merchant profile not found");
    }
    
    whereClause.merchantId = merchant.id;
  } else if (user.role === "DELIVERY_PERSON") {
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: { userId: user.id },
    });
    
    if (!deliveryPerson) {
      throw new Error("Delivery person profile not found");
    }
    
    whereClause.deliveryPersonId = deliveryPerson.id;
  }

  // Apply additional filters
  if (filters.entityType && filters.entityType !== "all") {
    whereClause.entityType = filters.entityType.toUpperCase();
  }

  // Fetch payments with related data
  const payments = await prisma.payment.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      merchant: {
        select: {
          id: true,
          businessName: true,
        },
      },
      deliveryPerson: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform data for report
  return payments.map(payment => ({
    id: payment.id,
    date: payment.createdAt.toISOString(),
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    entityType: payment.entityType,
    customerName: payment.customer?.user?.name || "N/A",
    merchantName: payment.merchant?.businessName || "N/A",
    deliveryPersonName: payment.deliveryPerson?.user?.name || "N/A",
    receiptUrl: payment.receiptUrl || "N/A",
  }));
}

// Helper function to get activity report data
async function getActivityReportData(
  startDate: Date,
  endDate: Date,
  filters: Record<string, any> = {},
  user: any
): Promise<any[]> {
  // Placeholder - in a real implementation, this would query activity logs
  // and format them according to the export requirements
  
  // For this example, we'll return daily stats
  const dailyStats = await prisma.dailyStats.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "asc",
    },
  });
  
  return dailyStats.map(stat => ({
    date: stat.date.toISOString().split("T")[0],
    newUsers: stat.newUsers,
    activeUsers: stat.activeUsers,
    completedDeliveries: stat.completedDeliveries,
    failedDeliveries: stat.failedDeliveries,
    totalRevenue: stat.totalRevenue,
    totalOrders: stat.totalOrders,
    averageDeliveryTime: stat.averageDeliveryTime || 0,
    customerSatisfaction: stat.customerSatisfaction || 0,
  }));
}

// Helper function to get deliveries report data
async function getDeliveriesReportData(
  startDate: Date,
  endDate: Date,
  filters: Record<string, any> = {},
  user: any
): Promise<any[]> {
  // Basic where clause for deliveries
  const whereClause: Record<string, any> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Apply filters based on user role
  if (user.role === "MERCHANT") {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: user.id },
    });
    
    if (!merchant) {
      throw new Error("Merchant profile not found");
    }
    
    whereClause.merchantId = merchant.id;
  } else if (user.role === "DELIVERY_PERSON") {
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: { userId: user.id },
    });
    
    if (!deliveryPerson) {
      throw new Error("Delivery person profile not found");
    }
    
    whereClause.deliveryPersonId = deliveryPerson.id;
  }

  // Apply status filter if provided
  if (filters.status && filters.status !== "all") {
    whereClause.status = filters.status;
  }

  // Fetch deliveries with related data
  const deliveries = await prisma.delivery.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      deliveryPerson: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      merchant: {
        select: {
          id: true,
          businessName: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform data for report
  return deliveries.map(delivery => ({
    id: delivery.id,
    trackingNumber: delivery.trackingNumber,
    status: delivery.status,
    createdAt: delivery.createdAt.toISOString(),
    pickupDate: delivery.pickupDate ? delivery.pickupDate.toISOString() : null,
    estimatedDelivery: delivery.estimatedDelivery ? delivery.estimatedDelivery.toISOString() : null,
    actualDelivery: delivery.actualDelivery ? delivery.actualDelivery.toISOString() : null,
    distance: delivery.distance || 0,
    price: delivery.price,
    customerName: delivery.customer?.user?.name || "N/A",
    deliveryPersonName: delivery.deliveryPerson?.user?.name || "N/A",
    merchantName: delivery.merchant?.businessName || "N/A",
    paymentStatus: delivery.payment?.status || "N/A",
  }));
}

// Helper function to get users report data
async function getUsersReportData(
  startDate: Date,
  endDate: Date,
  filters: Record<string, any> = {},
  user: any
): Promise<any[]> {
  // Only admins should be able to export user data
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    throw new Error("Only administrators can export user data");
  }

  // Basic where clause for users
  const whereClause: Record<string, any> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Apply role filter if provided
  if (filters.role && filters.role !== "all") {
    whereClause.role = filters.role.toUpperCase();
  }

  // Fetch users
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform data for report
  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
  }));
}

// Helper function to get orders report data
async function getOrdersReportData(
  startDate: Date,
  endDate: Date,
  filters: Record<string, any> = {},
  user: any
): Promise<any[]> {
  // Basic where clause for orders (cartDrop)
  const whereClause: Record<string, any> = {
    orderDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Apply filters based on user role
  if (user.role === "MERCHANT") {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: user.id },
    });
    
    if (!merchant) {
      throw new Error("Merchant profile not found");
    }
    
    whereClause.merchantId = merchant.id;
  }

  // Apply status filter if provided
  if (filters.status && filters.status !== "all") {
    whereClause.status = filters.status;
  }

  // Fetch orders with items
  const orders = await prisma.cartDrop.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      merchant: {
        select: {
          id: true,
          businessName: true,
        },
      },
      delivery: {
        select: {
          id: true,
          status: true,
          trackingNumber: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      orderDate: "desc",
    },
  });

  // Calculate order totals
  const ordersWithTotals = orders.map(order => {
    const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      id: order.id,
      orderReference: order.orderReference,
      orderDate: order.orderDate.toISOString(),
      scheduledDelivery: order.scheduledDelivery.toISOString(),
      status: order.status,
      customerName: order.customer?.user?.name || "N/A",
      customerEmail: order.customer?.user?.email || "N/A",
      merchantName: order.merchant?.businessName || "N/A",
      deliveryStatus: order.delivery?.status || "N/A",
      trackingNumber: order.delivery?.trackingNumber || "N/A",
      totalAmount,
      totalItems,
      notes: order.notes || "",
    };
  });

  return ordersWithTotals;
}

// Helper function to get custom report data
async function getCustomReportData(
  startDate: Date,
  endDate: Date,
  filters: Record<string, any> = {},
  user: any
): Promise<any[]> {
  // Custom reports would require specific business logic
  // This is just a placeholder implementation
  throw new Error("Custom reports are not implemented yet");
}

// Function to generate export file based on format
async function generateExport(
  data: any[],
  exportRequest: ExportRequest
): Promise<{ fileUrl: string; fileName: string }> {
  const { format, reportType, title } = exportRequest;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${reportType}-report-${timestamp}.${format}`;

  // In a real implementation, this would:
  // 1. Generate the appropriate file format (CSV, PDF, Excel)
  // 2. Save it to storage (S3, local filesystem, etc.)
  // 3. Return the URL to access the file

  // For this example, we'll return a placeholder URL
  // Simulating file generation delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const fileUrl = `/api/reports/download/${fileName}?token=${Buffer.from(exportRequest.reportType).toString('base64')}`;

  return {
    fileUrl,
    fileName,
  };
} 