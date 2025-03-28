import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get request parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate") as string) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate") as string) : undefined;
    const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount") as string) : undefined;
    const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount") as string) : undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder")?.toLowerCase() === "asc" ? "asc" : "desc";

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Find user's customer profile
    const customer = await prisma.customer.findFirst({
      where: { userId: session.user.id }
    });

    // Find user's delivery person profile (if exists)
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: { userId: session.user.id }
    });

    // Find user's merchant profile (if exists)
    const merchant = await prisma.merchant.findFirst({
      where: { userId: session.user.id }
    });

    // Find user's service provider profile (if exists)
    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: { userId: session.user.id }
    });

    // Build where clause based on user's role(s)
    const whereClause: any = {
      OR: []
    };

    if (customer) {
      whereClause.OR.push({ customerId: customer.id });
    }

    if (deliveryPerson) {
      whereClause.OR.push({ deliveryPersonId: deliveryPerson.id });
    }

    if (merchant) {
      whereClause.OR.push({ merchantId: merchant.id });
    }

    if (serviceProvider) {
      whereClause.OR.push({ serviceProviderId: serviceProvider.id });
    }

    // If user has no profiles, they can't have payments
    if (whereClause.OR.length === 0) {
      return NextResponse.json({
        data: [],
        meta: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Add filters to the where clause
    if (status) {
      whereClause.status = status;
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      
      if (startDate) {
        whereClause.createdAt.gte = startDate;
      }
      
      if (endDate) {
        // Add one day to include transactions on the end date
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        whereClause.createdAt.lt = adjustedEndDate;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      whereClause.amount = {};
      
      if (minAmount !== undefined) {
        whereClause.amount.gte = minAmount;
      }
      
      if (maxAmount !== undefined) {
        whereClause.amount.lte = maxAmount;
      }
    }

    // Prepare order by clause
    const validSortFields = ["createdAt", "amount", "status", "paymentMethod", "entityType"];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    
    const orderBy = { [orderByField]: sortOrder };

    // Get total count of matching payments
    const totalCount = await prisma.payment.count({
      where: whereClause
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch payments with pagination and related data
    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        deliveryPerson: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        serviceProvider: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        delivery: {
          select: {
            id: true,
            trackingNumber: true,
            status: true,
          }
        },
        service: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        refunds: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          }
        }
      }
    });

    // Calculate summary statistics
    const totalAmountPaid = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalAmountRefunded = payments
      .filter(p => p.status === "REFUNDED" || p.refunds.some(r => r.status === "COMPLETED"))
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      data: payments,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalAmountPaid,
        totalAmountRefunded,
        netAmount: totalAmountPaid - totalAmountRefunded,
        paymentCount: totalCount
      }
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique des paiements" },
      { status: 500 }
    );
  }
} 