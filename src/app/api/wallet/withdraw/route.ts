import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for withdrawal requests
const withdrawalSchema = z.object({
  amount: z.number().positive(),
  bankAccountId: z.string().uuid(),
  description: z.string().min(3).max(255).optional(),
});

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
    const validatedData = withdrawalSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid withdrawal data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { amount, bankAccountId, description } = validatedData.data;

    // Check if user owns the bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: {
        id: bankAccountId,
        userId: session.user.id
      }
    });

    if (!bankAccount) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Bank account not found or doesn't belong to you"
        }
      }, { status: 404 });
    }

    // Check if sufficient funds
    if (wallet.balance < amount) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INSUFFICIENT_FUNDS",
          message: "Insufficient funds in wallet to complete this withdrawal"
        }
      }, { status: 400 });
    }

    // Generate a unique reference for the withdrawal
    const withdrawalReference = `WDR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Process withdrawal in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create pending withdrawal transaction
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: "WITHDRAWAL",
          status: "PENDING", // Initial status is pending for withdrawals
          description: description || `Withdrawal to bank account ending in ${bankAccount.accountNumber.slice(-4)}`,
          metadata: {
            bankAccountId,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
          },
          reference: withdrawalReference,
        }
      });

      // Update wallet balance (hold the funds)
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: wallet.balance - amount,
          pendingWithdrawals: wallet.pendingWithdrawals + amount 
        }
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: session.user.id,
          transactionId: transaction.id,
          bankAccountId,
          amount,
          currency: wallet.currency,
          status: "PENDING",
          estimatedArrivalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Estimated 2 days
          reference: withdrawalReference
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "WITHDRAWAL_INITIATED",
          entityType: "WITHDRAWAL",
          entityId: withdrawal.id,
          details: `Withdrawal of ${amount} ${wallet.currency} to bank account ending in ${bankAccount.accountNumber.slice(-4)} initiated`
        }
      });

      return { transaction, withdrawal, updatedWallet };
    });

    // Return success response with withdrawal details
    return NextResponse.json({
      success: true,
      data: {
        withdrawal: result.withdrawal,
        transaction: result.transaction,
        newBalance: result.updatedWallet.balance,
        estimatedArrivalDate: result.withdrawal.estimatedArrivalDate
      },
      message: "Withdrawal initiated successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error initiating withdrawal:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to process withdrawal request"
      }
    }, { status: 500 });
  }
} 