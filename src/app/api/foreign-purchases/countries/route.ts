import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for query parameters
const queryParamsSchema = z.object({
  search: z.string().optional(),
  region: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).default("true"),
  sortBy: z.enum(["name", "region", "popularity"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
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
          message: "You must be logged in to view available countries"
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
      search,
      region,
      isActive,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Build filter conditions
    const whereClause: Prisma.CountryWhereInput = {};

    // Filter by search query
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by region
    if (region) {
      whereClause.region = { contains: region, mode: "insensitive" };
    }

    // Filter by active status
    if (isActive !== "all") {
      whereClause.isActive = isActive === "true";
    }

    // For foreign purchases, we only want to show countries that are supported
    whereClause.supportsForeignPurchase = true;

    // Determine sorting
    let orderBy: Prisma.CountryOrderByWithRelationInput;
    
    if (sortBy === "popularity") {
      orderBy = {
        foreignPurchases: {
          _count: sortOrder
        }
      };
    } else {
      orderBy = {
        [sortBy]: sortOrder
      };
    }

    // Fetch countries based on criteria
    const countries = await prisma.country.findMany({
      where: whereClause,
      orderBy,
      select: {
        id: true,
        name: true,
        code: true,
        flagUrl: true,
        region: true,
        currencyCode: true,
        currencySymbol: true,
        isActive: true,
        shippingTimeEstimate: true,
        supportsForeignPurchase: true,
        _count: {
          select: {
            foreignPurchases: true
          }
        }
      }
    });

    // Fetch delivery time and cost estimates if available
    const deliveryInfo = await prisma.countryShippingInfo.findMany({
      where: {
        countryId: {
          in: countries.map(country => country.id)
        }
      },
      select: {
        countryId: true,
        shippingMethod: true,
        estimatedDeliveryDays: true,
        baseCost: true,
        weightFactorPerKg: true,
        customsHandlingFee: true
      }
    });

    // Organize shipping info by country
    const shippingInfoByCountry = deliveryInfo.reduce((acc, info) => {
      if (!acc[info.countryId]) {
        acc[info.countryId] = [];
      }
      acc[info.countryId].push(info);
      return acc;
    }, {} as Record<string, typeof deliveryInfo>);

    // Merge shipping info with countries
    const countriesWithShippingInfo = countries.map(country => ({
      ...country,
      shippingOptions: shippingInfoByCountry[country.id] || []
    }));

    // Return countries with metadata
    return NextResponse.json({
      success: true,
      data: {
        countries: countriesWithShippingInfo,
        meta: {
          totalCount: countriesWithShippingInfo.length,
          activeCount: countriesWithShippingInfo.filter(c => c.isActive).length
        }
      }
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch countries"
      }
    }, { status: 500 });
  }
} 