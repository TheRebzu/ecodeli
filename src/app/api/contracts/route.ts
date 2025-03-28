import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Query parameters schema for validation
const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "TERMINATED", "all"]).optional().default("all"),
  startDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)), 
    { message: "Invalid date format" }
  ),
  endDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid date format" }
  ),
  contractType: z.string().optional(),
  sortBy: z.enum(["createdAt", "startDate", "endDate", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Type for where clause to fix linter error
interface WhereClause {
  merchantId: string;
  status?: string;
  contractType?: string;
  startDate?: {
    gte?: Date;
    lte?: Date;
  };
  endDate?: {
    gte?: Date;
    lte?: Date;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find merchant profile
    const merchant = await prisma.merchant.findFirst({
      where: { userId: session.user.id }
    });

    // Check if user is a merchant
    if (!merchant) {
      return NextResponse.json({ error: "Only merchants can access contracts" }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      status: searchParams.get("status") || "all",
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      contractType: searchParams.get("contractType"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    const validatedParams = queryParamsSchema.parse(queryParams);

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Build where clause
    const whereClause: WhereClause = {
      merchantId: merchant.id,
    };

    // Filter by status
    if (validatedParams.status !== "all") {
      whereClause.status = validatedParams.status;
    }

    // Filter by contract type
    if (validatedParams.contractType) {
      whereClause.contractType = validatedParams.contractType;
    }

    // Filter by start date
    if (validatedParams.startDate || validatedParams.endDate) {
      whereClause.startDate = {};

      if (validatedParams.startDate) {
        whereClause.startDate.gte = new Date(validatedParams.startDate);
      }

      if (validatedParams.endDate) {
        whereClause.startDate.lte = new Date(validatedParams.endDate);
      }
    }

    // Get contracts count for pagination
    const totalCount = await prisma.contract.count({
      where: whereClause,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / validatedParams.limit);

    // Fetch contracts with pagination and sorting
    const contracts = await prisma.contract.findMany({
      where: whereClause,
      orderBy: {
        [validatedParams.sortBy]: validatedParams.sortOrder,
      },
      skip,
      take: validatedParams.limit,
    });

    // Return contracts with pagination metadata
    return NextResponse.json({
      data: contracts,
      meta: {
        currentPage: validatedParams.page,
        totalPages,
        totalCount,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching contracts:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
} 