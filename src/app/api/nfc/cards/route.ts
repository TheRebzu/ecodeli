import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["cardNumber", "activationDate", "lastUsed"]).optional().default("activationDate"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  deliveryPersonId: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins, delivery persons, and managers can access NFC cards
    if (!["ADMIN", "DELIVERY_PERSON", "MERCHANT"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions." },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const validatedParams = queryParamsSchema.parse({
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 10,
      isActive: url.searchParams.get("isActive") || "all",
      sortBy: url.searchParams.get("sortBy") || "activationDate",
      sortOrder: url.searchParams.get("sortOrder") || "desc",
      deliveryPersonId: url.searchParams.get("deliveryPersonId"),
      search: url.searchParams.get("search"),
    });

    // Build filter conditions
    const whereClause: Prisma.NFCCardWhereInput = {};

    // Filter by active status
    if (validatedParams.isActive !== "all") {
      whereClause.isActive = validatedParams.isActive === "true";
    }

    // Filter by delivery person ID
    if (validatedParams.deliveryPersonId) {
      whereClause.deliveryPersonId = validatedParams.deliveryPersonId;
    } else if (session.user.role === "DELIVERY_PERSON") {
      // If the user is a delivery person, only show their cards
      const deliveryPerson = await prisma.deliveryPerson.findFirst({
        where: { userId: session.user.id },
      });

      if (!deliveryPerson) {
        return NextResponse.json(
          { error: "Delivery person profile not found" },
          { status: 404 }
        );
      }

      whereClause.deliveryPersonId = deliveryPerson.id;
    }

    // Handle search query
    if (validatedParams.search) {
      whereClause.cardNumber = {
        contains: validatedParams.search,
        mode: 'insensitive',
      };
    }

    // Calculate pagination values
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Prepare sort options
    const orderBy: Prisma.NFCCardOrderByWithRelationInput = {
      [validatedParams.sortBy]: validatedParams.sortOrder,
    };

    // Fetch NFC cards with pagination
    const [cards, totalCount] = await Promise.all([
      prisma.nFCCard.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: validatedParams.limit,
        include: {
          deliveryPerson: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      prisma.nFCCard.count({ where: whereClause }),
    ]);

    // Get recent transactions for each card
    const cardsWithTransactions = await Promise.all(
      cards.map(async (card) => {
        const recentTransactions = await prisma.nFCTransaction.findMany({
          where: { cardNumber: card.cardNumber },
          orderBy: { timestamp: "desc" },
          take: 5,
        });

        return {
          ...card,
          recentTransactions,
        };
      })
    );

    // Prepare response with pagination metadata
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPrevPage = validatedParams.page > 1;

    return NextResponse.json({
      data: cardsWithTransactions,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching NFC cards:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch NFC cards" },
      { status: 500 }
    );
  }
} 