import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for creating a transaction
const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["DEPOSIT", "PAYMENT", "REFUND"]), // WITHDRAWAL has its own endpoint
  description: z.string().min(3).max(255),
  metadata: z.record(z.any()).optional(),
  reference: z.string().optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "PAYMENT", "REFUND", "ALL"]).default("ALL"),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED", "ALL"]).default("ALL"),
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
      type,
      minAmount,
      maxAmount,
      status,
      sortOrder
    } = validatedQuery.data;

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

    if (type !== "ALL") {
      transactionFilter.type = type;
    }

    if (minAmount !== undefined) {
      transactionFilter.amount = {
        ...transactionFilter.amount,
        gte: minAmount
      };
    }

    if (maxAmount !== undefined) {
      transactionFilter.amount = {
        ...transactionFilter.amount,
        lte: maxAmount
      };
    }

    if (status !== "ALL") {
      transactionFilter.status = status;
    }

    // Fetch transactions with pagination and filtering
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

    // Calculate summary statistics
    const depositSum = await prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    });

    const withdrawalSum = await prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        type: "WITHDRAWAL",
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    });

    // Return transactions with metadata
    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalDeposits: depositSum._sum.amount || 0,
          totalWithdrawals: withdrawalSum._sum.amount || 0,
          currentBalance: wallet.balance
        },
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
    console.error("Error fetching transactions:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch transactions"
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

    // Check if wallet is active
    if (!wallet.isActive) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Wallet is inactive. Please contact support."
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createTransactionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { amount, type, description, metadata, reference } = validatedData.data;

    // Generate a reference if not provided
    const transactionReference = reference || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Process transaction in a database transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type,
          status: "COMPLETED", // Assume success for deposits and payments
          description,
          metadata: metadata || {},
          reference: transactionReference,
        }
      });

      // Update wallet balance based on transaction type
      let newBalance = wallet.balance;
      if (type === "DEPOSIT" || type === "REFUND") {
        newBalance += amount;
      } else if (type === "PAYMENT") {
        // Check if sufficient funds for payments
        if (wallet.balance < amount) {
          throw new Error("Insufficient funds");
        }
        newBalance -= amount;
      }

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: `${type}_TRANSACTION`,
          entityType: "TRANSACTION",
          entityId: transaction.id,
          details: `${type} transaction of ${amount} ${wallet.currency} created: ${description}`
        }
      });

      return { transaction, updatedWallet };
    }).catch(error => {
      // Handle specific errors
      if (error.message === "Insufficient funds") {
        throw new Error("Insufficient funds");
      }
      throw error; // Re-throw other errors
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction: result.transaction,
        newBalance: result.updatedWallet.balance
      },
      message: "Transaction created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    
    // Handle specific errors with appropriate responses
    if (error instanceof Error && error.message === "Insufficient funds") {
      return NextResponse.json({
        success: false,
        error: {
          code: "INSUFFICIENT_FUNDS",
          message: "Insufficient funds in wallet to complete this transaction"
        }
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to create transaction"
      }
    }, { status: 500 });
  }
} 