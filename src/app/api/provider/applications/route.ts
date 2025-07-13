import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema pour création d'application à un service
const createApplicationSchema = z.object({
  serviceRequestId: z
    .string()
    .min(1, "L'ID de la demande de service est requis"),
  message: z
    .string()
    .min(10, "Le message doit contenir au moins 10 caractères"),
  proposedPrice: z.number().min(0, "Le prix proposé doit être positif"),
  estimatedDuration: z
    .number()
    .min(0.5, "La durée estimée doit être d'au moins 30 minutes"),
  availability: z.string().min(1, "Les disponibilités sont requises"),
  canStartImmediately: z.boolean().default(false),
  materialsIncluded: z.boolean().default(false),
  materialsDescription: z.string().optional(),
  experienceDescription: z.string().optional(),
  guaranteeOffered: z.string().optional(),
  insuranceCovered: z.boolean().default(false),
});

// Schema pour filtres des applications
const applicationsFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.string().optional(),
  serviceRequestId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(["createdAt", "proposedPrice", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  try {
    console.log("🏠 [GET /api/provider/applications] Début de la requête");

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil prestataire
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const params = applicationsFiltersSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      serviceRequestId: searchParams.get("serviceRequestId"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    // Construire la clause WHERE
    const where: any = {
      providerId: provider.id,
    };

    if ((await params).status) where.status = (await params).status;
    if ((await params).serviceRequestId)
      where.serviceRequestId = (await params).serviceRequestId;
    if ((await params).dateFrom || (await params).dateTo) {
      where.createdAt = {};
      if ((await params).dateFrom)
        where.createdAt.gte = new Date((await params).dateFrom);
      if ((await params).dateTo)
        where.createdAt.lte = new Date((await params).dateTo);
    }

    // Récupérer les applications
    const applications = await db.serviceApplication.findMany({
      where,
      include: {
        serviceRequest: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy:
        (await params).sortBy === "createdAt"
          ? { createdAt: (await params).sortOrder }
          : (await params).sortBy === "proposedPrice"
            ? { proposedPrice: (await params).sortOrder }
            : { status: (await params).sortOrder },
      skip: ((await params).page - 1) * (await params).limit,
      take: (await params).limit,
    });

    // Formater les données
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      message: app.message,
      proposedPrice: Number(app.proposedPrice),
      estimatedDuration: app.estimatedDuration,
      availability: app.availability,
      canStartImmediately: app.canStartImmediately,
      materialsIncluded: app.materialsIncluded,
      materialsDescription: app.materialsDescription,
      experienceDescription: app.experienceDescription,
      guaranteeOffered: app.guaranteeOffered,
      insuranceCovered: app.insuranceCovered,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),

      serviceRequest: {
        id: app.serviceRequest.id,
        title: app.serviceRequest.title,
        description: app.serviceRequest.description,
        serviceType: app.serviceRequest.serviceType,
        status: app.serviceRequest.status,
        budget: Number(app.serviceRequest.budget),
        duration: app.serviceRequest.duration,
        urgency: app.serviceRequest.urgency,
        address: app.serviceRequest.address,
        city: app.serviceRequest.city,
        scheduledAt: app.serviceRequest.scheduledAt?.toISOString(),
        isRecurring: app.serviceRequest.isRecurring,
        createdAt: app.serviceRequest.createdAt.toISOString(),

        client: {
          id: app.serviceRequest.client.id,
          name: app.serviceRequest.client.user.profile
            ? `${app.serviceRequest.client.user.profile.firstName || ""} ${app.serviceRequest.client.user.profile.lastName || ""}`.trim()
            : app.serviceRequest.client.user.email,
          rating: Number(app.serviceRequest.client.rating),
          city: app.serviceRequest.client.user.profile?.city,
        },
      },
    }));

    const total = await db.serviceApplication.count({ where });

    // Statistiques rapides
    const statusStats = await db.serviceApplication.groupBy({
      by: ["status"],
      where: { providerId: provider.id },
      _count: { _all: true },
    });

    const stats = statusStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(
      `✅ Trouvé ${formattedApplications.length} candidatures sur ${total} total`,
    );

    return NextResponse.json({
      applications: formattedApplications,
      pagination: {
        page: (await params).page,
        limit: (await params).limit,
        total,
        totalPages: Math.ceil(total / (await params).limit),
        hasNext: (await params).page < Math.ceil(total / (await params).limit),
        hasPrev: (await params).page > 1,
      },
      stats: {
        total,
        byStatus: stats,
      },
    });
  } catch (error) {
    console.error("❌ Erreur récupération candidatures prestataire:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🏠 [POST /api/provider/applications] Création candidature");

    const user = await getUserFromSession(request);
    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil prestataire
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    if (!provider.isValidated) {
      return NextResponse.json(
        {
          error:
            "Votre compte prestataire doit être validé avant de pouvoir candidater",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createApplicationSchema.parse(body);

    // Vérifier que la demande de service existe et est active
    const serviceRequest = await db.serviceRequest.findUnique({
      where: { id: validatedData.serviceRequestId },
      include: {
        client: true,
        applications: true,
      },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { error: "Demande de service non trouvée" },
        { status: 404 },
      );
    }

    if (serviceRequest.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Cette demande de service n'est plus disponible",
        },
        { status: 400 },
      );
    }

    if (
      serviceRequest.assignedProviderId &&
      serviceRequest.assignedProviderId !== provider.id
    ) {
      return NextResponse.json(
        {
          error: "Cette demande de service a déjà été assignée",
        },
        { status: 400 },
      );
    }

    // Vérifier que le prestataire n'a pas déjà candidaté
    const existingApplication = await db.serviceApplication.findFirst({
      where: {
        serviceRequestId: validatedData.serviceRequestId,
        providerId: provider.id,
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        {
          error: "Vous avez déjà candidaté pour cette demande de service",
        },
        { status: 400 },
      );
    }

    // Créer la candidature
    const newApplication = await db.serviceApplication.create({
      data: {
        serviceRequestId: validatedData.serviceRequestId,
        providerId: provider.id,
        message: validatedData.message,
        proposedPrice: validatedData.proposedPrice,
        estimatedDuration: validatedData.estimatedDuration,
        availability: validatedData.availability,
        canStartImmediately: validatedData.canStartImmediately,
        materialsIncluded: validatedData.materialsIncluded,
        materialsDescription: validatedData.materialsDescription,
        experienceDescription: validatedData.experienceDescription,
        guaranteeOffered: validatedData.guaranteeOffered,
        insuranceCovered: validatedData.insuranceCovered,
        status: "PENDING",
      },
      include: {
        serviceRequest: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log("✅ Candidature créée:", newApplication.id);

    return NextResponse.json(
      {
        success: true,
        application: {
          id: newApplication.id,
          message: newApplication.message,
          proposedPrice: Number(newApplication.proposedPrice),
          estimatedDuration: newApplication.estimatedDuration,
          availability: newApplication.availability,
          status: newApplication.status,
          createdAt: newApplication.createdAt.toISOString(),

          serviceRequest: {
            id: newApplication.serviceRequest.id,
            title: newApplication.serviceRequest.title,
            serviceType: newApplication.serviceRequest.serviceType,
            budget: Number(newApplication.serviceRequest.budget),
            client: {
              name: newApplication.serviceRequest.client.user.profile
                ? `${newApplication.serviceRequest.client.user.profile.firstName || ""} ${newApplication.serviceRequest.client.user.profile.lastName || ""}`.trim()
                : newApplication.serviceRequest.client.user.email,
            },
          },
        },
        message: "Candidature envoyée avec succès",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("❌ Erreur création candidature:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
