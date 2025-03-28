import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  merchantId: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(["sales", "revenue", "popularity"]).default("revenue"),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// GET: Analyze product performance
export async function GET(req: NextRequest) {
  try {
    // Authenticate user and verify admin or merchant permission
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin or merchant role
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
      merchantId: searchParams.get("merchantId"),
      category: searchParams.get("category"),
      sortBy: searchParams.get("sortBy") || "revenue",
      limit: searchParams.get("limit") || 20,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, merchantId, category, sortBy, limit } = validatedParams.data;

    // For merchants, override merchantId with their own ID
    const effectiveMerchantId = session.user.role === "MERCHANT" ? merchantUserId : merchantId;

    // Determine date range based on period
    const now = new Date();
    const dateFrom = new Date();
    
    switch (period) {
      case "week":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "month":
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case "year":
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all products
    const productsFilter: Record<string, unknown> = {
      isDeleted: false,
    };

    if (effectiveMerchantId) {
      productsFilter.merchantId = effectiveMerchantId;
    }

    if (category) {
      productsFilter.category = category;
    }

    const products = await prisma.product.findMany({
      where: productsFilter,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get cart items for the period
    const cartItems = await prisma.cartItem.findMany({
      where: {
        cartDrop: {
          orderDate: {
            gte: dateFrom,
            lte: now,
          },
        },
      },
      include: {
        cartDrop: true,
      },
    });

    // Analyze product performance
    const productPerformance = products.map(product => {
      // Find cart items for this product
      const productCartItems = cartItems.filter(item => item.productId === product.id);
      
      // Calculate sales metrics
      const salesQuantity = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
      const salesRevenue = productCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Calculate number of unique customers
      const uniqueCustomers = new Set(productCartItems.map(item => item.cartDrop.customerId)).size;
      
      // Calculate average price (in case of discounts or price changes)
      const avgPrice = salesQuantity > 0 ? salesRevenue / salesQuantity : product.price;
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category || "Uncategorized",
        merchantId: product.merchantId,
        merchantName: product.merchant.name,
        price: product.price,
        metrics: {
          salesQuantity,
          salesRevenue,
          uniqueCustomers,
          avgPrice,
          popularity: uniqueCustomers > 0 ? (salesQuantity / uniqueCustomers) : 0,
        },
      };
    });

    // Sort products based on sortBy parameter
    const sortedProducts = productPerformance.sort((a, b) => {
      switch (sortBy) {
        case "sales":
          return b.metrics.salesQuantity - a.metrics.salesQuantity;
        case "popularity":
          return b.metrics.popularity - a.metrics.popularity;
        case "revenue":
        default:
          return b.metrics.salesRevenue - a.metrics.salesRevenue;
      }
    });

    // Get top products
    const topProducts = sortedProducts.slice(0, limit);

    // Calculate category performance
    const categoryPerformance: Record<string, {
      salesQuantity: number;
      salesRevenue: number;
      productCount: number;
      topProducts: string[];
    }> = {};

    sortedProducts.forEach(product => {
      const category = product.category;
      
      if (!categoryPerformance[category]) {
        categoryPerformance[category] = {
          salesQuantity: 0,
          salesRevenue: 0,
          productCount: 0,
          topProducts: [],
        };
      }
      
      categoryPerformance[category].salesQuantity += product.metrics.salesQuantity;
      categoryPerformance[category].salesRevenue += product.metrics.salesRevenue;
      categoryPerformance[category].productCount += 1;
      
      // Add to top products if in top 3 for this category
      const categoryProducts = sortedProducts
        .filter(p => p.category === category)
        .sort((a, b) => b.metrics.salesRevenue - a.metrics.salesRevenue)
        .slice(0, 3);
      
      if (categoryProducts.some(p => p.id === product.id)) {
        categoryPerformance[category].topProducts.push(product.name);
      }
    });

    // Calculate overall metrics
    const totalSalesQuantity = sortedProducts.reduce((sum, p) => sum + p.metrics.salesQuantity, 0);
    const totalSalesRevenue = sortedProducts.reduce((sum, p) => sum + p.metrics.salesRevenue, 0);
    const topPerformingCategories = Object.entries(categoryPerformance)
      .sort(([, a], [, b]) => b.salesRevenue - a.salesRevenue)
      .slice(0, 5)
      .map(([category, metrics]) => ({
        category,
        ...metrics,
        percentageOfTotalRevenue: totalSalesRevenue > 0 
          ? (metrics.salesRevenue / totalSalesRevenue) * 100 
          : 0,
      }));

    return NextResponse.json({
      data: {
        topProducts,
        categoryPerformance: topPerformingCategories,
        summary: {
          totalProducts: products.length,
          productsWithSales: sortedProducts.filter(p => p.metrics.salesQuantity > 0).length,
          totalSalesQuantity,
          totalSalesRevenue,
          avgRevenuePerProduct: products.length > 0 
            ? totalSalesRevenue / products.length 
            : 0,
        },
      },
      meta: {
        period,
        merchantId: effectiveMerchantId,
        category,
        sortBy,
        dateRange: {
          from: dateFrom,
          to: now,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error analyzing product performance:", error);
    return NextResponse.json(
      { error: "Failed to analyze product performance" },
      { status: 500 }
    );
  }
} 