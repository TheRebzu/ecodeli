import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Query parameters schema for validation
const queryParamsSchema = z.object({
  type: z.string().optional(),
  active: z.enum(["true", "false", "all"]).default("true"),
});

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = {
      type: searchParams.get("type"),
      active: searchParams.get("active") || "true",
    };

    const validatedParams = queryParamsSchema.parse(queryParams);

    // Build where clause
    interface WhereClause {
      type?: string;
      isActive?: boolean;
    }

    const whereClause: WhereClause = {};

    // Filter by contract type
    if (validatedParams.type) {
      whereClause.type = validatedParams.type;
    }

    // Filter by active status
    if (validatedParams.active !== "all") {
      whereClause.isActive = validatedParams.active === "true";
    }

    // Fetch contract templates
    const templates = await prisma.contractTemplate.findMany({
      where: whereClause,
      orderBy: {
        type: "asc",
      },
    });

    // Return templates
    return NextResponse.json({ data: templates });
  } catch (error: unknown) {
    console.error("Error fetching contract templates:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch contract templates" },
      { status: 500 }
    );
  }
} 