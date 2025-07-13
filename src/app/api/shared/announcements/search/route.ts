import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { announcementService } from "@/features/announcements/services/announcement.service";
import { auth } from "@/lib/auth";

const searchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(["PACKAGE", "SERVICE", "CART_DROP"]).optional(),
  status: z
    .enum(["ACTIVE", "MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  pickupAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  radius: z.number().min(1).max(100).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
  sortBy: z.enum(["createdAt", "price", "pickupDate", "distance"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const processedParams = {
      ...params,
      minPrice: (await params).minPrice
        ? parseFloat((await params).minPrice)
        : undefined,
      maxPrice: (await params).maxPrice
        ? parseFloat((await params).maxPrice)
        : undefined,
      radius: (await params).radius
        ? parseFloat((await params).radius)
        : undefined,
      tags: (await params).tags ? (await params).tags.split(",") : undefined,
      page: (await params).page ? parseInt((await params).page) : 1,
      limit: (await params).limit ? parseInt((await params).limit) : 10,
    };

    const validatedParams = searchSchema.parse(processedParams);

    const filters: any = {};

    if (session.user.role === "CLIENT") {
      filters.authorId = session.user.id;
    } else if (session.user.role === "ADMIN") {
      // Admin can see all announcements
    } else {
      filters.status = "ACTIVE";
    }

    if (validatedParams.query) {
      filters.OR = [
        { title: { contains: validatedParams.query, mode: "insensitive" } },
        {
          description: { contains: validatedParams.query, mode: "insensitive" },
        },
        {
          pickupAddress: {
            contains: validatedParams.query,
            mode: "insensitive",
          },
        },
        {
          deliveryAddress: {
            contains: validatedParams.query,
            mode: "insensitive",
          },
        },
      ];
    }

    if (validatedParams.type) filters.type = validatedParams.type;
    if (validatedParams.status) filters.status = validatedParams.status;
    if (validatedParams.urgency) filters.urgency = validatedParams.urgency;

    if (validatedParams.minPrice || validatedParams.maxPrice) {
      filters.price = {};
      if (validatedParams.minPrice)
        filters.price.gte = validatedParams.minPrice;
      if (validatedParams.maxPrice)
        filters.price.lte = validatedParams.maxPrice;
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      filters.pickupDate = {};
      if (validatedParams.dateFrom)
        filters.pickupDate.gte = new Date(validatedParams.dateFrom);
      if (validatedParams.dateTo)
        filters.pickupDate.lte = new Date(validatedParams.dateTo);
    }

    if (validatedParams.tags?.length) {
      filters.tags = { hasSome: validatedParams.tags };
    }

    const result = await announcementService.listAnnouncements(filters, {
      page: validatedParams.page || 1,
      limit: validatedParams.limit || 10,
      sortBy: validatedParams.sortBy || "createdAt",
      sortOrder: validatedParams.sortOrder || "desc",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching announcements:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
