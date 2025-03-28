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
    const type = searchParams.get("type") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate") as string) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate") as string) : undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder")?.toLowerCase() === "asc" ? "asc" : "desc";

    // Find user's delivery person profile
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

    if (!wallet) {
      return NextResponse.json({ 
        error: "Portefeuille introuvable" 
      }, { status: 404 });
    }

    // Build where clause for filtering
    const whereClause: any = { walletId: wallet.id };
    
    // Add type filter if specified
    if (type) {
      whereClause.type = type;
    }
    
    // Add date range filters if specified
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

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Prepare order by clause
    type OrderByField = "amount" | "createdAt" | "type";
    
    const validSortFields: OrderByField[] = ["amount", "createdAt", "type"];
    const orderByField = validSortFields.includes(sortBy as OrderByField) 
      ? sortBy as OrderByField 
      : "createdAt";
    
    const orderBy = { [orderByField]: sortOrder };

    // Get total count of matching transactions
    const totalCount = await prisma.walletTransaction.count({
      where: whereClause
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch transactions with pagination
    const transactions = await prisma.walletTransaction.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit
    });

    // Calculate totals for the filtered data
    const allFilteredTransactions = await prisma.walletTransaction.findMany({
      where: whereClause
    });

    const totalEarnings = allFilteredTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const totalExpenses = allFilteredTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return NextResponse.json({
      data: transactions,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalEarnings,
        totalExpenses,
        netAmount: totalEarnings - totalExpenses,
        transactionCount: totalCount
      }
    });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des transactions" },
      { status: 500 }
    );
  }
} 