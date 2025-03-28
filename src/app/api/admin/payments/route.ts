import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    // Retrieve query parameters
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount")!) : undefined;
    const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount")!) : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    
    // Build filter conditions
    const whereConditions = {};
    
    // Add filter for payment status
    if (status) {
      Object.assign(whereConditions, { status });
    }
    
    // Add date range filter
    if (startDate && endDate) {
      Object.assign(whereConditions, {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      });
    }
    
    // Add amount range filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      Object.assign(whereConditions, {
        amount: {
          ...(minAmount !== undefined && { gte: minAmount }),
          ...(maxAmount !== undefined && { lte: maxAmount })
        }
      });
    }
    
    // Add search filter
    if (search) {
      Object.assign(whereConditions, {
        OR: [
          { transactionId: { contains: search } },
          { invoiceId: { contains: search } },
          { userId: { contains: search } }
        ]
      });
    }
    
    // Count total payments matching the criteria
    const totalPayments = await prisma.payment.count({
      where: whereConditions
    });
    
    // Fetch payments with pagination
    const payments = await prisma.payment.findMany({
      where: whereConditions,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            dueDate: true
          }
        }
        // Include additional relationships as needed
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalPayments / limit);
    
    // Calculate summary statistics
    const totalAmountResult = await prisma.payment.aggregate({
      where: whereConditions,
      _sum: {
        amount: true
      }
    });
    
    const totalAmount = totalAmountResult._sum.amount || 0;
    
    return NextResponse.json({
      data: payments,
      meta: {
        total: totalPayments,
        page,
        limit,
        totalPages,
        totalAmount
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des paiements:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paiements" },
      { status: 500 }
    );
  }
} 