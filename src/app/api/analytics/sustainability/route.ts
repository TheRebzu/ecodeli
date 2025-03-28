import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  compare: z.boolean().default(false),
  merchantId: z.string().optional(),
});

// CO2 savings constants (in kg)
const CO2_SAVINGS = {
  REUSABLE_PACKAGING: 0.5, // kg of CO2 saved per reusable packaging
  LOCAL_PRODUCT: 1.2,      // kg of CO2 saved per local product 
  ORGANIC_PRODUCT: 0.8,    // kg of CO2 saved per organic product
  BIKE_DELIVERY: 2.3,      // kg of CO2 saved per bike delivery (vs car)
  EV_DELIVERY: 1.1,        // kg of CO2 saved per EV delivery (vs gas vehicle)
};

// Water savings constants (in liters)
const WATER_SAVINGS = {
  ORGANIC_PRODUCT: 45,     // liters of water saved per organic product
  LOCAL_PRODUCT: 30,       // liters of water saved per local product
};

// Define TypeScript interfaces for data structures
interface DeliveryVehicle {
  type: string;
}

interface Packaging {
  isReusable: boolean;
  isRecyclable: boolean;
}

interface Package {
  packaging?: Packaging;
}

interface Product {
  isLocal: boolean;
  isOrganic: boolean;
}

interface CartItem {
  product?: Product;
  quantity: number;
}

interface Delivery {
  vehicle?: DeliveryVehicle;
  packages?: Package[];
  cartItems?: CartItem[];
}

interface SustainabilityMetrics {
  totalDeliveries: number;
  co2Saved: {
    total: number;
    byReusablePackaging: number;
    byLocalProducts: number;
    byOrganicProducts: number;
    byGreenDelivery: number;
  };
  waterSaved: {
    total: number;
    byOrganicProducts: number;
    byLocalProducts: number;
  };
  packagingMetrics: {
    totalPackages: number;
    reusablePackages: number;
    recyclablePackages: number;
    ecoFriendlyPackages: number;
    ecoFriendlyPercentage: number;
  };
  transportMetrics: {
    totalDeliveries: number;
    bikeDeliveries: number;
    evDeliveries: number;
    greenDeliveries: number;
    greenDeliveryPercentage: number;
  };
  productMetrics: {
    totalProducts: number;
    localProducts: number;
    organicProducts: number;
    localProductsPercentage: number;
    organicProductsPercentage: number;
  };
}

// GET: Analyze sustainability metrics
export async function GET(req: NextRequest) {
  try {
    // Authenticate user and verify admin permission
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN" && session.user.role !== "MERCHANT") {
      return NextResponse.json(
        { error: "Unauthorized: Admin or merchant access required" },
        { status: 403 }
      );
    }

    // If user is a merchant, get their merchant ID
    let merchantUserId = null;
    if (session.user.role === "MERCHANT") {
      const merchant = await prisma.merchant.findFirst({
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!merchant) {
        return NextResponse.json(
          { error: "Merchant profile not found" },
          { status: 404 }
        );
      }

      merchantUserId = merchant.id;
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      period: searchParams.get("period") || "month",
      compare: searchParams.get("compare") === "true",
      merchantId: searchParams.get("merchantId"),
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, compare, merchantId } = validatedParams.data;
    
    // For merchants, override merchantId with their own ID
    const effectiveMerchantId = session.user.role === "MERCHANT" ? merchantUserId : merchantId;

    // Determine current period date range
    const now = new Date();
    const currentPeriodEnd = new Date(now);
    const currentPeriodStart = new Date(now);
    
    // Determine previous period date range for comparison
    const previousPeriodEnd = new Date(currentPeriodStart);
    const previousPeriodStart = new Date(previousPeriodEnd);
    
    switch (period) {
      case "week":
        currentPeriodStart.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(previousPeriodEnd.getDate() - 7);
        break;
      case "month":
        currentPeriodStart.setMonth(now.getMonth() - 1);
        previousPeriodStart.setMonth(previousPeriodEnd.getMonth() - 1);
        break;
      case "quarter":
        currentPeriodStart.setMonth(now.getMonth() - 3);
        previousPeriodStart.setMonth(previousPeriodEnd.getMonth() - 3);
        break;
      case "year":
        currentPeriodStart.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(previousPeriodEnd.getFullYear() - 1);
        break;
    }

    // Build base filter for deliveries
    const deliveryBaseFilter: Record<string, unknown> = {
      status: "COMPLETED",
    };

    if (effectiveMerchantId) {
      deliveryBaseFilter.merchantId = effectiveMerchantId;
    }

    // Get deliveries for current period
    const currentPeriodDeliveries = await prisma.delivery.findMany({
      where: {
        ...deliveryBaseFilter,
        deliveryDate: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
      include: {
        vehicle: true,
        packages: {
          include: {
            packaging: true,
          },
        },
        cartItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // If comparison is requested, get deliveries for previous period
    let previousPeriodDeliveries = [];
    if (compare) {
      previousPeriodDeliveries = await prisma.delivery.findMany({
        where: {
          ...deliveryBaseFilter,
          deliveryDate: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd,
          },
        },
        include: {
          vehicle: true,
          packages: {
            include: {
              packaging: true,
            },
          },
          cartItems: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    // Calculate sustainability metrics for current period
    const currentMetrics = calculateSustainabilityMetrics(currentPeriodDeliveries);
    
    // Calculate sustainability metrics for previous period if requested
    const previousMetrics = compare
      ? calculateSustainabilityMetrics(previousPeriodDeliveries)
      : null;

    // Calculate percent changes if comparison is requested
    const changes = compare && previousMetrics
      ? {
          totalDeliveries: calculatePercentChange(
            previousMetrics.totalDeliveries, 
            currentMetrics.totalDeliveries
          ),
          co2Saved: calculatePercentChange(
            previousMetrics.co2Saved.total, 
            currentMetrics.co2Saved.total
          ),
          waterSaved: calculatePercentChange(
            previousMetrics.waterSaved.total, 
            currentMetrics.waterSaved.total
          ),
          ecoFriendlyPackaging: calculatePercentChange(
            previousMetrics.packagingMetrics.ecoFriendlyPercentage, 
            currentMetrics.packagingMetrics.ecoFriendlyPercentage
          ),
          greenDeliveryMethods: calculatePercentChange(
            previousMetrics.transportMetrics.greenDeliveryPercentage, 
            currentMetrics.transportMetrics.greenDeliveryPercentage
          ),
          localProducts: calculatePercentChange(
            previousMetrics.productMetrics.localProductsPercentage, 
            currentMetrics.productMetrics.localProductsPercentage
          ),
          organicProducts: calculatePercentChange(
            previousMetrics.productMetrics.organicProductsPercentage, 
            currentMetrics.productMetrics.organicProductsPercentage
          ),
        }
      : null;

    // Build the response
    const response = {
      data: {
        metrics: currentMetrics,
        greenScore: calculateGreenScore(currentMetrics),
        ecoImpact: {
          treesEquivalent: (currentMetrics.co2Saved.total / 21).toFixed(2), // Average tree absorbs 21kg CO2 per year
          carKmAvoided: (currentMetrics.co2Saved.total / 0.12).toFixed(2),  // Average car emits 0.12kg CO2 per km
          waterBottlesEquivalent: (currentMetrics.waterSaved.total / 1.5).toFixed(2), // 1.5L water bottles
        },
      },
      meta: {
        period,
        dateRange: {
          from: currentPeriodStart,
          to: currentPeriodEnd,
        },
        merchantId: effectiveMerchantId,
      },
    };

    // Add comparison data if requested
    if (compare && previousMetrics && changes) {
      response.data = {
        ...response.data,
        comparison: {
          previousPeriod: {
            metrics: previousMetrics,
            greenScore: calculateGreenScore(previousMetrics),
            dateRange: {
              from: previousPeriodStart,
              to: previousPeriodEnd,
            },
          },
          changes,
        },
      };
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error analyzing sustainability metrics:", error);
    return NextResponse.json(
      { error: "Failed to analyze sustainability metrics" },
      { status: 500 }
    );
  }
}

// Helper functions

// Calculate sustainability metrics from deliveries
function calculateSustainabilityMetrics(deliveries: Delivery[]): SustainabilityMetrics {
  const totalDeliveries = deliveries.length;
  
  // Initialize counters
  let co2SavedReusablePackaging = 0;
  let co2SavedLocalProducts = 0;
  let co2SavedOrganicProducts = 0;
  let co2SavedGreenDelivery = 0;
  
  let waterSavedOrganicProducts = 0;
  let waterSavedLocalProducts = 0;
  
  let totalPackages = 0;
  let reusablePackages = 0;
  let recyclablePackages = 0;
  
  let bikeDeliveries = 0;
  let evDeliveries = 0;
  
  let totalProducts = 0;
  let localProducts = 0;
  let organicProducts = 0;
  
  // Process each delivery
  deliveries.forEach(delivery => {
    // Analyze delivery method
    if (delivery.vehicle) {
      if (delivery.vehicle.type === "BIKE") {
        bikeDeliveries++;
        co2SavedGreenDelivery += CO2_SAVINGS.BIKE_DELIVERY;
      } else if (delivery.vehicle.type === "ELECTRIC") {
        evDeliveries++;
        co2SavedGreenDelivery += CO2_SAVINGS.EV_DELIVERY;
      }
    }
    
    // Analyze packaging
    if (delivery.packages && delivery.packages.length > 0) {
      delivery.packages.forEach((pkg: Package) => {
        totalPackages++;
        
        if (pkg.packaging) {
          if (pkg.packaging.isReusable) {
            reusablePackages++;
            co2SavedReusablePackaging += CO2_SAVINGS.REUSABLE_PACKAGING;
          }
          
          if (pkg.packaging.isRecyclable) {
            recyclablePackages++;
          }
        }
      });
    }
    
    // Analyze products
    if (delivery.cartItems && delivery.cartItems.length > 0) {
      delivery.cartItems.forEach((item: CartItem) => {
        if (item.product) {
          totalProducts += item.quantity;
          
          if (item.product.isLocal) {
            localProducts += item.quantity;
            co2SavedLocalProducts += CO2_SAVINGS.LOCAL_PRODUCT * item.quantity;
            waterSavedLocalProducts += WATER_SAVINGS.LOCAL_PRODUCT * item.quantity;
          }
          
          if (item.product.isOrganic) {
            organicProducts += item.quantity;
            co2SavedOrganicProducts += CO2_SAVINGS.ORGANIC_PRODUCT * item.quantity;
            waterSavedOrganicProducts += WATER_SAVINGS.ORGANIC_PRODUCT * item.quantity;
          }
        }
      });
    }
  });
  
  // Calculate totals and percentages
  const totalCO2Saved = co2SavedReusablePackaging + co2SavedLocalProducts + 
    co2SavedOrganicProducts + co2SavedGreenDelivery;
  
  const totalWaterSaved = waterSavedOrganicProducts + waterSavedLocalProducts;
  
  const ecoFriendlyPackages = reusablePackages + recyclablePackages;
  const ecoFriendlyPercentage = totalPackages > 0 
    ? (ecoFriendlyPackages / totalPackages) * 100 
    : 0;
  
  const greenDeliveries = bikeDeliveries + evDeliveries;
  const greenDeliveryPercentage = totalDeliveries > 0 
    ? (greenDeliveries / totalDeliveries) * 100 
    : 0;
  
  const localProductsPercentage = totalProducts > 0 
    ? (localProducts / totalProducts) * 100 
    : 0;
  
  const organicProductsPercentage = totalProducts > 0 
    ? (organicProducts / totalProducts) * 100 
    : 0;
  
  return {
    totalDeliveries,
    co2Saved: {
      total: totalCO2Saved,
      byReusablePackaging: co2SavedReusablePackaging,
      byLocalProducts: co2SavedLocalProducts,
      byOrganicProducts: co2SavedOrganicProducts,
      byGreenDelivery: co2SavedGreenDelivery,
    },
    waterSaved: {
      total: totalWaterSaved,
      byOrganicProducts: waterSavedOrganicProducts,
      byLocalProducts: waterSavedLocalProducts,
    },
    packagingMetrics: {
      totalPackages,
      reusablePackages,
      recyclablePackages,
      ecoFriendlyPackages,
      ecoFriendlyPercentage,
    },
    transportMetrics: {
      totalDeliveries,
      bikeDeliveries,
      evDeliveries,
      greenDeliveries,
      greenDeliveryPercentage,
    },
    productMetrics: {
      totalProducts,
      localProducts,
      organicProducts,
      localProductsPercentage,
      organicProductsPercentage,
    },
  };
}

// Calculate green score (0-100)
function calculateGreenScore(metrics: SustainabilityMetrics): number {
  const packagingScore = metrics.packagingMetrics.ecoFriendlyPercentage * 0.3;
  const transportScore = metrics.transportMetrics.greenDeliveryPercentage * 0.4;
  const productScore = (
    metrics.productMetrics.localProductsPercentage * 0.15 +
    metrics.productMetrics.organicProductsPercentage * 0.15
  );
  
  return Math.round(packagingScore + transportScore + productScore);
}

// Calculate percent change between two values
function calculatePercentChange(previous: number, current: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  return ((current - previous) / previous) * 100;
} 