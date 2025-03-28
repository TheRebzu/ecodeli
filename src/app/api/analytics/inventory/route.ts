import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  merchantId: z.string().optional(),
  warehouseId: z.string().optional(),
  category: z.string().optional(),
  lowStockThreshold: z.coerce.number().int().positive().default(10),
});

// Interfaces for type safety
interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  averageTurnoverRate: number;
}

interface ProductInventory {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  optimalStock: number;
  costPrice: number;
  retailPrice: number;
  totalValue: number;
  salesVelocity: number;
  turnoverRate: number;
  daysUntilOutOfStock: number | null;
  stockStatus: 'low' | 'out' | 'optimal' | 'excess';
}

interface CategoryInventory {
  category: string;
  totalItems: number;
  totalValue: number;
  averageTurnoverRate: number;
  lowStockPercentage: number;
}

interface WarehouseInventory {
  id: string;
  name: string;
  totalItems: number;
  totalValue: number;
  availableCapacity: number;
  utilizationRate: number;
  mostStockedCategory: string;
}

// GET: Analyze inventory performance
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
      warehouseId: searchParams.get("warehouseId"),
      category: searchParams.get("category"),
      lowStockThreshold: searchParams.get("lowStockThreshold") || 10,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, merchantId, warehouseId, category, lowStockThreshold } = validatedParams.data;

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

    // Build filters
    const inventoryFilter: Record<string, unknown> = {};
    if (effectiveMerchantId) {
      inventoryFilter.product = {
        merchantId: effectiveMerchantId,
      };
    }
    
    if (warehouseId) {
      inventoryFilter.warehouseId = warehouseId;
    }
    
    if (category) {
      inventoryFilter.product = {
        ...inventoryFilter.product as Record<string, unknown>,
        category,
      };
    }

    // Get inventory items
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: inventoryFilter,
      include: {
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
      },
    });

    // Get orders for the period to calculate sales velocity
    const orderItemsFilter: Record<string, unknown> = {
      cartDrop: {
        orderDate: {
          gte: dateFrom,
          lte: now,
        },
        status: "COMPLETED",
      },
    };

    if (effectiveMerchantId) {
      orderItemsFilter.product = {
        merchantId: effectiveMerchantId,
      };
    }

    if (category) {
      orderItemsFilter.product = {
        ...orderItemsFilter.product as Record<string, unknown>,
        category,
      };
    }

    const orderItems = await prisma.cartItem.findMany({
      where: orderItemsFilter,
      include: {
        product: {
          select: {
            id: true,
          },
        },
        cartDrop: {
          select: {
            orderDate: true,
          },
        },
      },
    });

    // Calculate sales by product
    const salesByProduct = new Map<string, number>();
    orderItems.forEach(item => {
      const productId = item.productId;
      const currentSales = salesByProduct.get(productId) || 0;
      salesByProduct.set(productId, currentSales + item.quantity);
    });

    // Days in period for calculating sales velocity
    const daysInPeriod = Math.ceil((now.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));

    // Process inventory data
    const productInventories: ProductInventory[] = [];
    const warehouseMap = new Map<string, WarehouseInventory>();
    const categoryMap = new Map<string, CategoryInventory>();

    inventoryItems.forEach(item => {
      const product = item.product;
      const warehouse = item.warehouse;
      
      // Skip if product or warehouse doesn't exist
      if (!product || !warehouse) return;
      
      // Calculate sales velocity (units sold per day)
      const totalSales = salesByProduct.get(product.id) || 0;
      const salesVelocity = totalSales / daysInPeriod;
      
      // Calculate turnover rate (how many times inventory has been sold in the period)
      const averageInventory = (item.currentStock + item.initialStock) / 2;
      const turnoverRate = averageInventory > 0 ? totalSales / averageInventory : 0;
      
      // Calculate days until out of stock
      const daysUntilOutOfStock = salesVelocity > 0 
        ? Math.floor(item.currentStock / salesVelocity)
        : null;
      
      // Determine stock status
      let stockStatus: 'low' | 'out' | 'optimal' | 'excess';
      if (item.currentStock <= 0) {
        stockStatus = 'out';
      } else if (item.currentStock <= item.reorderPoint) {
        stockStatus = 'low';
      } else if (item.currentStock > item.optimalStock * 1.5) {
        stockStatus = 'excess';
      } else {
        stockStatus = 'optimal';
      }
      
      // Calculate inventory value
      const totalValue = item.currentStock * (product.costPrice || 0);
      
      // Add to product inventories
      productInventories.push({
        id: product.id,
        name: product.name,
        sku: product.sku || '',
        category: product.category || 'Uncategorized',
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
        optimalStock: item.optimalStock,
        costPrice: product.costPrice || 0,
        retailPrice: product.price,
        totalValue,
        salesVelocity,
        turnoverRate,
        daysUntilOutOfStock,
        stockStatus,
      });
      
      // Update warehouse data
      const warehouseId = warehouse.id;
      if (!warehouseMap.has(warehouseId)) {
        warehouseMap.set(warehouseId, {
          id: warehouse.id,
          name: warehouse.name,
          totalItems: 0,
          totalValue: 0,
          availableCapacity: warehouse.capacity || 0,
          utilizationRate: 0,
          mostStockedCategory: '',
        });
      }
      
      const warehouseData = warehouseMap.get(warehouseId)!;
      warehouseData.totalItems += item.currentStock;
      warehouseData.totalValue += totalValue;
      
      // Update category data
      const productCategory = product.category || 'Uncategorized';
      if (!categoryMap.has(productCategory)) {
        categoryMap.set(productCategory, {
          category: productCategory,
          totalItems: 0,
          totalValue: 0,
          averageTurnoverRate: 0,
          lowStockPercentage: 0,
        });
      }
      
      const categoryData = categoryMap.get(productCategory)!;
      categoryData.totalItems += item.currentStock;
      categoryData.totalValue += totalValue;
    });

    // Calculate warehouse utilization rates and most stocked categories
    const warehouseInventories: WarehouseInventory[] = [];
    const categoriesInWarehouses = new Map<string, Map<string, number>>();
    
    inventoryItems.forEach(item => {
      if (!item.product || !item.warehouse) return;
      
      const warehouseId = item.warehouse.id;
      const category = item.product.category || 'Uncategorized';
      
      if (!categoriesInWarehouses.has(warehouseId)) {
        categoriesInWarehouses.set(warehouseId, new Map<string, number>());
      }
      
      const categoryCount = categoriesInWarehouses.get(warehouseId)!;
      categoryCount.set(category, (categoryCount.get(category) || 0) + item.currentStock);
    });
    
    warehouseMap.forEach((warehouse, id) => {
      let mostStockedCategory = 'None';
      let maxItems = 0;
      
      const categoryCount = categoriesInWarehouses.get(id);
      if (categoryCount) {
        categoryCount.forEach((count, category) => {
          if (count > maxItems) {
            maxItems = count;
            mostStockedCategory = category;
          }
        });
      }
      
      warehouse.mostStockedCategory = mostStockedCategory;
      warehouse.utilizationRate = warehouse.availableCapacity > 0 
        ? (warehouse.totalItems / warehouse.availableCapacity) * 100
        : 0;
      
      warehouseInventories.push(warehouse);
    });

    // Calculate final category metrics
    const categoryInventories: CategoryInventory[] = [];
    const lowStockProductsByCategory = new Map<string, number>();
    
    productInventories.forEach(product => {
      if (product.stockStatus === 'low' || product.stockStatus === 'out') {
        const category = product.category;
        lowStockProductsByCategory.set(
          category, 
          (lowStockProductsByCategory.get(category) || 0) + 1
        );
      }
    });
    
    const productsByCategory = new Map<string, number>();
    productInventories.forEach(product => {
      const category = product.category;
      productsByCategory.set(
        category, 
        (productsByCategory.get(category) || 0) + 1
      );
    });
    
    categoryMap.forEach((category, name) => {
      const totalProducts = productsByCategory.get(name) || 0;
      const lowStockProducts = lowStockProductsByCategory.get(name) || 0;
      
      category.lowStockPercentage = totalProducts > 0 
        ? (lowStockProducts / totalProducts) * 100
        : 0;
      
      // Calculate average turnover rate for products in this category
      const categoryProducts = productInventories.filter(p => p.category === name);
      const totalTurnover = categoryProducts.reduce((sum, p) => sum + p.turnoverRate, 0);
      category.averageTurnoverRate = categoryProducts.length > 0
        ? totalTurnover / categoryProducts.length
        : 0;
      
      categoryInventories.push(category);
    });

    // Sort products by stock status (critical items first)
    const sortedProducts = productInventories.sort((a, b) => {
      const statusOrder = { out: 0, low: 1, optimal: 2, excess: 3 };
      return statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
    });

    // Calculate overall inventory stats
    const inventoryStats: InventoryStats = {
      totalItems: productInventories.reduce((sum, p) => sum + p.currentStock, 0),
      totalValue: productInventories.reduce((sum, p) => sum + p.totalValue, 0),
      lowStockItems: productInventories.filter(p => p.stockStatus === 'low').length,
      outOfStockItems: productInventories.filter(p => p.stockStatus === 'out').length,
      overStockItems: productInventories.filter(p => p.stockStatus === 'excess').length,
      averageTurnoverRate: productInventories.length > 0
        ? productInventories.reduce((sum, p) => sum + p.turnoverRate, 0) / productInventories.length
        : 0,
    };

    // Identify critical items needing attention
    const criticalItems = sortedProducts
      .filter(p => p.stockStatus === 'out' || p.stockStatus === 'low')
      .slice(0, 10);

    // Identify slow-moving items
    const slowMovingItems = [...productInventories]
      .filter(p => p.currentStock > 0)
      .sort((a, b) => a.turnoverRate - b.turnoverRate)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        summary: inventoryStats,
        criticalItems,
        slowMovingItems,
        products: sortedProducts,
        categories: categoryInventories.sort((a, b) => b.totalValue - a.totalValue),
        warehouses: warehouseInventories.sort((a, b) => b.totalValue - a.totalValue),
      },
      meta: {
        period,
        dateRange: {
          from: dateFrom,
          to: now,
        },
        merchantId: effectiveMerchantId,
        warehouseId,
        category,
        lowStockThreshold,
      },
    });
  } catch (error: unknown) {
    console.error("Error analyzing inventory:", error);
    return NextResponse.json(
      { error: "Failed to analyze inventory" },
      { status: 500 }
    );
  }
} 