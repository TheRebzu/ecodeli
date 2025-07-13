import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ContractService } from "@/features/contracts/services/contract.service";

const contractCreationSchema = z.object({
  merchantId: z.string().cuid(),
  type: z.enum(["STANDARD", "PREMIUM", "ENTERPRISE", "CUSTOM"]),
  title: z.string().min(1),
  description: z.string().optional(),
  commissionRate: z.number().min(0).max(100),
  minCommissionAmount: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional(),
  monthlyFee: z.number().min(0).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  maxOrdersPerMonth: z.number().min(0).optional(),
  maxOrderValue: z.number().min(0).optional(),
  deliveryZones: z.array(z.string()),
  allowedServices: z.array(z.string()),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET - Récupérer les contrats avec filtres
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Paramètres de filtrage
    const status = searchParams.get("status")?.split(",") as any[];
    const type = searchParams.get("type")?.split(",") as any[];
    const merchantId = searchParams.get("merchantId");
    const validFrom = searchParams.get("validFrom")
      ? new Date(searchParams.get("validFrom")!)
      : undefined;
    const validUntil = searchParams.get("validUntil")
      ? new Date(searchParams.get("validUntil")!)
      : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Si stats=true, retourner les statistiques
    if (searchParams.get("stats") === "true") {
      const [total, active, pending, terminated] = await Promise.all([
        prisma.contract.count(),
        prisma.contract.count({ where: { status: "ACTIVE" } }),
        prisma.contract.count({ where: { status: "PENDING" } }),
        prisma.contract.count({ where: { status: "TERMINATED" } }),
      ]);

      const recentContracts = await prisma.contract.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          merchant: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
        },
      });

      return NextResponse.json({
        total,
        active,
        pending,
        terminated,
        recentContracts,
      });
    }

    // Récupérer les contrats avec filtres
    const result = await ContractService.getContracts({
      status,
      type,
      merchantId,
      validFrom,
      validUntil,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in contracts API:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des contrats" },
      { status: 500 },
    );
  }
}

/**
 * POST - Créer un nouveau contrat
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validation des données
    const validatedData = contractCreationSchema.parse({
      ...body,
      validFrom: new Date(body.validFrom).toISOString(),
      validUntil: body.validUntil
        ? new Date(body.validUntil).toISOString()
        : undefined,
    });

    // Vérifier que le commerçant existe
    const merchant = await prisma.merchant.findUnique({
      where: { id: validatedData.merchantId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Commerçant non trouvé" },
        { status: 404 },
      );
    }

    // Créer le contrat
    const contract = await ContractService.createContract({
      merchantId: validatedData.merchantId,
      type: validatedData.type,
      title: validatedData.title,
      description: validatedData.description,
      commissionRate: validatedData.commissionRate,
      minCommissionAmount: validatedData.minCommissionAmount,
      setupFee: validatedData.setupFee,
      monthlyFee: validatedData.monthlyFee,
      validFrom: new Date(validatedData.validFrom),
      validUntil: validatedData.validUntil
        ? new Date(validatedData.validUntil)
        : undefined,
      maxOrdersPerMonth: validatedData.maxOrdersPerMonth,
      maxOrderValue: validatedData.maxOrderValue,
      deliveryZones: validatedData.deliveryZones,
      allowedServices: validatedData.allowedServices,
      notes: validatedData.notes,
      tags: validatedData.tags,
    });

    return NextResponse.json({
      success: true,
      message: "Contrat créé avec succès",
      contract,
    });
  } catch (error) {
    console.error("Error creating contract:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("existe déjà")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la création du contrat" },
      { status: 500 },
    );
  }
}
