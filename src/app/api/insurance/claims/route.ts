import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for creating a claim
const createClaimSchema = z.object({
  insuranceId: z.string(),
  description: z.string().min(10).max(500),
  incidentDate: z.string(), // ISO date string
  damageType: z.enum(["LOST", "DAMAGED", "STOLEN", "OTHER"]),
  requestedAmount: z.number().positive(),
  evidenceUrls: z.array(z.string().url()).optional(),
  additionalNotes: z.string().max(1000).optional(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  claimId: z.string().optional(),
  insuranceId: z.string().optional(),
  status: z.enum(["PENDING", "REVIEWING", "APPROVED", "DENIED", "PAID"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// POST: Submit a new insurance claim
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = createClaimSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const {
      insuranceId,
      description,
      incidentDate,
      damageType,
      requestedAmount,
      evidenceUrls,
      additionalNotes,
    } = validatedBody.data;

    // Verify insurance exists and belongs to the user
    const insurance = await prisma.insurance.findFirst({
      where: {
        id: insuranceId,
        delivery: {
          userId: session.user.id,
        },
      },
      include: {
        delivery: true,
      },
    });

    if (!insurance) {
      return NextResponse.json(
        { error: "Insurance not found or unauthorized" },
        { status: 404 }
      );
    }

    // Create the claim
    const claim = await prisma.insuranceClaim.create({
      data: {
        insuranceId,
        description,
        incidentDate: new Date(incidentDate),
        damageType,
        requestedAmount,
        evidenceUrls: evidenceUrls || [],
        additionalNotes: additionalNotes || "",
        status: "PENDING",
        claimNumber: `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      },
    });

    // Create notification for the claim
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Insurance Claim Submitted",
        message: `Your claim #${claim.claimNumber} has been submitted and is under review.`,
        type: "INFO",
        actionUrl: `/insurance/claims/${claim.id}`,
      },
    });

    return NextResponse.json({
      data: claim,
    });
  } catch (error: unknown) {
    console.error("Error submitting insurance claim:", error);
    return NextResponse.json(
      { error: "Failed to submit insurance claim" },
      { status: 500 }
    );
  }
}

// GET: Retrieve claims or a specific claim
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      claimId: searchParams.get("claimId"),
      insuranceId: searchParams.get("insuranceId"),
      status: searchParams.get("status"),
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { claimId, insuranceId, status, page, limit } = validatedParams.data;
    const skip = (page - 1) * limit;

    // If claimId is provided, fetch a single claim
    if (claimId) {
      const claim = await prisma.insuranceClaim.findFirst({
        where: {
          id: claimId,
          insurance: {
            delivery: {
              userId: session.user.id,
            },
          },
        },
        include: {
          insurance: {
            include: {
              delivery: {
                select: {
                  id: true,
                  trackingNumber: true,
                },
              },
            },
          },
        },
      });

      if (!claim) {
        return NextResponse.json(
          { error: "Claim not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: claim,
      });
    }

    // Build query for listing claims
    const whereClause: Prisma.InsuranceClaimWhereInput = {
      insurance: {
        delivery: {
          userId: session.user.id,
        },
      },
    };

    if (insuranceId) {
      whereClause.insuranceId = insuranceId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Fetch claims with pagination
    const [claims, totalCount] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where: whereClause,
        include: {
          insurance: {
            include: {
              delivery: {
                select: {
                  id: true,
                  trackingNumber: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.insuranceClaim.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      data: claims,
      meta: {
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching insurance claims:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance claims" },
      { status: 500 }
    );
  }
} 