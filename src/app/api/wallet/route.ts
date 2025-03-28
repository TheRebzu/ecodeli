import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for wallet initialization
const initWalletSchema = z.object({
  currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
  initialDeposit: z.number().nonnegative().optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  transactionType: z.enum(["DEPOSIT", "WITHDRAWAL", "PAYMENT", "REFUND", "ALL"]).default("ALL"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Invalid query parameters",
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const {
      page,
      limit,
      startDate,
      endDate,
      transactionType,
      sortOrder
    } = validatedQuery.data;

    // Find user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Wallet not found. Initialize your wallet first."
        }
      }, { status: 404 });
    }

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Build transaction filter
    const transactionFilter: Prisma.TransactionWhereInput = {
      walletId: wallet.id,
    };

    if (startDate) {
      transactionFilter.createdAt = {
        ...transactionFilter.createdAt,
        gte: new Date(startDate)
      };
    }

    if (endDate) {
      transactionFilter.createdAt = {
        ...transactionFilter.createdAt,
        lte: new Date(endDate)
      };
    }

    if (transactionType !== "ALL") {
      transactionFilter.type = transactionType;
    }

    // Fetch recent transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: transactionFilter,
        orderBy: {
          createdAt: sortOrder
        },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: transactionFilter })
    ]);

    // Fetch pending withdrawals if any
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    // Return wallet data with recent transactions
    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          pendingWithdrawals: wallet.pendingWithdrawals,
          currency: wallet.currency,
          isActive: wallet.isActive,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt
        },
        recentTransactions: transactions,
        pendingWithdrawals,
        meta: {
          pagination: {
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch wallet"
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    // Check if user already has a wallet
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (existingWallet) {
      return NextResponse.json({
        success: false,
        error: {
          code: "ALREADY_EXISTS",
          message: "Wallet already exists for this user"
        }
      }, { status: 400 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = initWalletSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid wallet data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { currency, initialDeposit = 0 } = validatedData.data;

    // Create wallet and initial transaction in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the wallet
      const wallet = await tx.wallet.create({
        data: {
          userId: session.user.id,
          currency,
          balance: initialDeposit,
          isActive: true,
          pendingWithdrawals: 0,
        }
      });

      // If there's an initial deposit, create a transaction
      let transaction = null;
      if (initialDeposit > 0) {
        transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: initialDeposit,
            type: "DEPOSIT",
            status: "COMPLETED",
            description: "Initial wallet deposit",
            metadata: {},
            reference: `INIT-${Date.now()}`
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "WALLET_CREATED",
          entityType: "WALLET",
          entityId: wallet.id,
          details: `Wallet created with ${currency} currency${initialDeposit > 0 ? ` and initial deposit of ${initialDeposit}` : ''}`
        }
      });

      return { wallet, transaction };
    });

    // Return success response with wallet data
    return NextResponse.json({
      success: true,
      data: {
        wallet: result.wallet,
        initialTransaction: result.transaction
      },
      message: "Wallet initialized successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error initializing wallet:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to initialize wallet"
      }
    }, { status: 500 });
  }
} 