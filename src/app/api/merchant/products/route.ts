import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 },
      );
    }

    // Get products
    const products = await prisma.product.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const lowStockProducts = products.filter(
      (p) => p.stockQuantity <= p.minStockAlert,
    ).length;
    const totalValue = products.reduce(
      (sum, p) => sum + p.price * p.stockQuantity,
      0,
    );
    const categories = new Set(products.map((p) => p.category).filter(Boolean))
      .size;

    const stats = {
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalValue,
      categories,
    };

    return NextResponse.json({
      products,
      stats,
    });
  } catch (error) {
    console.error("Error fetching merchant products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      originalPrice,
      sku,
      category,
      brand,
      weight,
      dimensions,
      images = [],
      stockQuantity = 0,
      minStockAlert = 5,
      tags = [],
      metadata,
    } = body;

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 },
      );
    }

    // Check if SKU is unique
    if (sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingProduct) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 409 },
        );
      }
    }

    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        sku,
        category,
        brand,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        images,
        stockQuantity: parseInt(stockQuantity),
        minStockAlert: parseInt(minStockAlert),
        tags,
        metadata,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
