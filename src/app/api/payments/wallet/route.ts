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

    // Find user's delivery person profile since wallets are linked to delivery persons
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: { userId: session.user.id }
    });

    if (!deliveryPerson) {
      return NextResponse.json({ 
        error: "Utilisateur n'est pas un livreur" 
      }, { status: 404 });
    }

    // Get wallet for the delivery person
    const wallet = await prisma.wallet.findUnique({
      where: { deliveryPersonId: deliveryPerson.id }
    });

    // If wallet doesn't exist, create one
    if (!wallet) {
      const newWallet = await prisma.wallet.create({
        data: {
          balance: 0,
          currency: "EUR",
          deliveryPersonId: deliveryPerson.id
        }
      });

      return NextResponse.json({
        balance: newWallet.balance,
        currency: newWallet.currency,
        lastUpdated: newWallet.lastUpdated
      });
    }

    // Get statistics about the wallet
    const stats = await getWalletStatistics(wallet.id);

    // Return wallet info with statistics
    return NextResponse.json({
      balance: wallet.balance,
      currency: wallet.currency,
      lastUpdated: wallet.lastUpdated,
      statistics: stats
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du portefeuille" },
      { status: 500 }
    );
  }
}

// Calculate wallet statistics
async function getWalletStatistics(walletId: string) {
  // Get current date
  const now = new Date();
  
  // Calculate date for 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get first day of current month
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get transaction total for last 30 days
  const last30DaysTransactions = await prisma.walletTransaction.findMany({
    where: {
      walletId,
      createdAt: {
        gte: thirtyDaysAgo,
        lte: now
      }
    }
  });
  
  // Get transaction total for current month
  const currentMonthTransactions = await prisma.walletTransaction.findMany({
    where: {
      walletId,
      createdAt: {
        gte: firstDayOfMonth,
        lte: now
      }
    }
  });
  
  // Calculate earnings and expenses
  const earnings30Days = last30DaysTransactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const expenses30Days = last30DaysTransactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
  const earningsCurrentMonth = currentMonthTransactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const expensesCurrentMonth = currentMonthTransactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  
  // Get transaction counts by type
  const transactionCounts = await prisma.$queryRaw`
    SELECT type, COUNT(*) as count 
    FROM "WalletTransaction" 
    WHERE "walletId" = ${walletId}
    GROUP BY type
  `;
  
  return {
    last30Days: {
      earnings: earnings30Days,
      expenses: expenses30Days,
      net: earnings30Days - expenses30Days,
      transactionCount: last30DaysTransactions.length
    },
    currentMonth: {
      earnings: earningsCurrentMonth,
      expenses: expensesCurrentMonth,
      net: earningsCurrentMonth - expensesCurrentMonth,
      transactionCount: currentMonthTransactions.length
    },
    transactionCounts
  };
} 