import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Get statistics for driver advertisements
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
    
    // Get query parameters for time range
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") 
      ? new Date(searchParams.get("startDate")!) 
      : new Date(new Date().setMonth(new Date().getMonth() - 1)); // Default to last month
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : new Date(); // Default to current date
    
    // Validate date range
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }
    
    // Query total count of advertisements
    const totalAdvertisements = await prisma.driverAdvertisement.count();
    
    // Query active advertisements count
    const activeAdvertisements = await prisma.driverAdvertisement.count({
      where: { status: "ACTIVE" }
    });
    
    // Query advertisements created in the specified date range
    const newAdvertisements = await prisma.driverAdvertisement.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Query total responses count
    const totalResponses = await prisma.adResponse.count();
    
    // Query responses in the specified date range
    const newResponses = await prisma.adResponse.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Query responses by status
    const responsesByStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM "AdResponse" 
      GROUP BY status
    `;
    
    // Query top vehicle types
    const vehicleTypes = await prisma.$queryRaw`
      SELECT "vehicleType", COUNT(*) as count 
      FROM "DriverAdvertisement" 
      GROUP BY "vehicleType" 
      ORDER BY count DESC
      LIMIT 5
    `;
    
    // Query top service areas
    const topServiceAreas = await prisma.$queryRaw`
      SELECT city, COUNT(*) as count 
      FROM "AdServiceArea" 
      GROUP BY city 
      ORDER BY count DESC
      LIMIT 10
    `;
    
    // Query advertisements with most responses
    const popularAdvertisements = await prisma.driverAdvertisement.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        _count: {
          select: { responses: true }
        }
      },
      orderBy: {
        responses: { _count: "desc" }
      },
      take: 5
    });
    
    // Query advertisements with most interest expressions
    const interestingAdvertisements = await prisma.driverAdvertisement.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        _count: {
          select: { interests: true }
        }
      },
      orderBy: {
        interests: { _count: "desc" }
      },
      take: 5
    });
    
    // Calculate average responses per advertisement
    const avgResponsesPerAd = totalAdvertisements > 0 
      ? totalResponses / totalAdvertisements 
      : 0;
    
    // Return compiled statistics
    return NextResponse.json({
      overview: {
        totalAdvertisements,
        activeAdvertisements,
        newAdvertisements,
        totalResponses,
        newResponses,
        avgResponsesPerAd: Math.round(avgResponsesPerAd * 100) / 100
      },
      responsesByStatus,
      vehicleTypes,
      topServiceAreas,
      popularAdvertisements,
      interestingAdvertisements,
      dateRange: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
} 