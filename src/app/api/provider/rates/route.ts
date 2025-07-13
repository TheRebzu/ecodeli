import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createRateSchema = z.object({
  providerId: z.string().cuid(),
  serviceType: z.string(),
  proposedRate: z.number().positive(),
  minimumCharge: z.number().optional(),
  providerNotes: z.string().optional(),
});

// GET - Liste des tarifs du Provider
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || session.user.id;

    // Trouver le provider
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [{ id: providerId }, { userId: providerId }],
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Récupérer les tarifs
    const rates = await prisma.providerRate.findMany({
      where: {
        providerId: provider.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      rates: rates.map((rate) => ({
        id: rate.id,
        serviceType: rate.serviceType,
        baseRate: rate.baseRate,
        proposedRate: rate.proposedRate,
        negotiatedRate: rate.negotiatedRate,
        unitType: rate.unitType,
        minimumCharge: rate.minimumCharge,
        status: rate.status,
        adminNotes: rate.adminNotes,
        providerNotes: rate.providerNotes,
        lastModified: rate.updatedAt.toISOString(),
        approvedAt: rate.approvedAt?.toISOString(),
        commission: rate.commission,
        netRate: rate.netRate,
      })),
    });
  } catch (error) {
    console.error("Error fetching provider rates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Créer un nouveau tarif
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      providerId,
      serviceType,
      proposedRate,
      minimumCharge,
      providerNotes,
    } = createRateSchema.parse(body);

    // Trouver le provider
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { id: providerId },
          { userId: providerId },
          { userId: session.user.id },
        ],
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Vérifier qu'il n'y a pas déjà un tarif pour ce type de service
    const existingRate = await prisma.providerRate.findFirst({
      where: {
        providerId: provider.id,
        serviceType,
      },
    });

    if (existingRate) {
      return NextResponse.json(
        { error: "A rate already exists for this service type" },
        { status: 400 },
      );
    }

    // Configuration des tarifs par type de service
    const serviceRatesConfig = {
      CLEANING: { baseRate: 25, commission: 0.15, unit: "HOUR" },
      GARDENING: { baseRate: 20, commission: 0.12, unit: "HOUR" },
      HANDYMAN: { baseRate: 35, commission: 0.18, unit: "HOUR" },
      TUTORING: { baseRate: 30, commission: 0.1, unit: "HOUR" },
      HEALTHCARE: { baseRate: 45, commission: 0.08, unit: "HOUR" },
      BEAUTY: { baseRate: 40, commission: 0.15, unit: "HOUR" },
      PET_SITTING: { baseRate: 15, commission: 0.2, unit: "HOUR" },
    };

    const config =
      serviceRatesConfig[serviceType as keyof typeof serviceRatesConfig];
    if (!config) {
      return NextResponse.json(
        { error: "Invalid service type" },
        { status: 400 },
      );
    }

    // Calculer le tarif net après commission
    const commission = config.commission;
    const netRate = proposedRate * (1 - commission);

    // Créer le tarif
    const rate = await prisma.providerRate.create({
      data: {
        providerId: provider.id,
        serviceType,
        baseRate: config.baseRate,
        proposedRate,
        unitType: config.unit,
        minimumCharge: minimumCharge || 0,
        status: "PENDING",
        providerNotes: providerNotes || "",
        commission,
        netRate,
      },
    });

    // Notifier les admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "Nouveau tarif prestataire à valider",
          content: `${provider.businessName} a proposé un tarif de ${proposedRate}€/${config.unit.toLowerCase()} pour ${serviceType}`,
          type: "PROVIDER_RATE",
          priority: "MEDIUM",
          data: {
            providerId: provider.id,
            rateId: rate.id,
            serviceType,
            proposedRate,
            action: "RATE_PROPOSED",
          },
        },
      });
    }

    return NextResponse.json({
      message: "Rate created successfully",
      rate: {
        id: rate.id,
        serviceType: rate.serviceType,
        proposedRate: rate.proposedRate,
        status: rate.status,
        commission: rate.commission,
        netRate: rate.netRate,
        createdAt: rate.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating provider rate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
