import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Query parameters schema for validation
const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED", "all"]).optional().default("all"),
  fromDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)), 
    { message: "Invalid date format" }
  ),
  toDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format" }
  ),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortBy: z.enum(["issueDate", "dueDate", "total", "status"]).default("issueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Type for where clause to fix linter error
interface WhereClause {
  merchantId?: string;
  status?: string;
  issueDate?: {
    gte?: Date;
    lte?: Date;
  };
  total?: {
    gte?: number;
    lte?: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      status: searchParams.get("status") || "all",
      fromDate: searchParams.get("fromDate"),
      toDate: searchParams.get("toDate"),
      minAmount: searchParams.get("minAmount"),
      maxAmount: searchParams.get("maxAmount"),
      sortBy: searchParams.get("sortBy") || "issueDate",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    const validatedParams = queryParamsSchema.parse(queryParams);

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Build where clause
    const whereClause: WhereClause = {};

    // If the user is a merchant, filter by merchant ID
    if (session.user.role === "MERCHANT") {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: session.user.id }
      });

      if (!merchant) {
        return NextResponse.json({ error: "Merchant profile not found" }, { status: 404 });
      }

      whereClause.merchantId = merchant.id;
    }

    // Filter by status
    if (validatedParams.status !== "all") {
      whereClause.status = validatedParams.status;
    }

    // Filter by date range
    if (validatedParams.fromDate || validatedParams.toDate) {
      whereClause.issueDate = {};

      if (validatedParams.fromDate) {
        whereClause.issueDate.gte = new Date(validatedParams.fromDate);
      }

      if (validatedParams.toDate) {
        whereClause.issueDate.lte = new Date(validatedParams.toDate);
      }
    }

    // Filter by amount range
    if (validatedParams.minAmount || validatedParams.maxAmount) {
      whereClause.total = {};

      if (validatedParams.minAmount) {
        whereClause.total.gte = validatedParams.minAmount;
      }

      if (validatedParams.maxAmount) {
        whereClause.total.lte = validatedParams.maxAmount;
      }
    }

    // Get invoices count for pagination
    const totalCount = await prisma.invoice.count({
      where: whereClause,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / validatedParams.limit);

    // Fetch invoices with pagination and sorting
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: {
        [validatedParams.sortBy]: validatedParams.sortOrder,
      },
      include: {
        payment: {
          select: {
            id: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        items: true,
      },
      skip,
      take: validatedParams.limit,
    });

    // Return invoices with pagination metadata
    return NextResponse.json({
      data: invoices,
      meta: {
        currentPage: validatedParams.page,
        totalPages,
        totalCount,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching invoices:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
} 