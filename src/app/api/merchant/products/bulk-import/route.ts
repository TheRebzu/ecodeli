import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload CSV or Excel file." },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    // TODO: Implement actual CSV/Excel parsing
    // For now, return a mock response
    const mockResult = {
      success: 15,
      failed: 2,
      errors: [
        "Invalid price format on row 3",
        "Missing required field on row 8",
      ],
      importedProducts: [
        {
          name: "Sample Product 1",
          price: 29.99,
          category: "Electronics",
          stockQuantity: 10,
        },
        {
          name: "Sample Product 2",
          price: 19.99,
          category: "Clothing",
          stockQuantity: 25,
        },
      ],
    };

    // Mock: Create some products in database
    for (const productData of mockResult.importedProducts) {
      await prisma.product.create({
        data: {
          merchantId: merchant.id,
          name: productData.name,
          price: productData.price,
          category: productData.category,
          stockQuantity: productData.stockQuantity,
          minStockAlert: 5,
          isActive: true,
          tags: [],
          images: [],
        },
      });
    }

    return NextResponse.json(mockResult, { status: 200 });
  } catch (error) {
    console.error("Error processing bulk import:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
