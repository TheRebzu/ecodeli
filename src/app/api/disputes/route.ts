import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const whereConditions: any = {
      userId: session.id,
    };

    if (status) {
      whereConditions.status = status;
    }

    if (type) {
      whereConditions.type = type;
    }

    const disputes = await prisma.dispute.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.dispute.count({
      where: whereConditions,
    });

    return NextResponse.json({
      disputes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des litiges" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, description, referenceId, amount } = body;

    // Validation des données
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "Type, titre et description sont requis" },
        { status: 400 },
      );
    }

    // Validation du type
    const validTypes = ["DELIVERY", "SERVICE", "PAYMENT", "STORAGE", "OTHER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type de litige invalide" },
        { status: 400 },
      );
    }

    // Création du litige
    const dispute = await prisma.dispute.create({
      data: {
        userId: session.id,
        type,
        title,
        description,
        referenceId: referenceId || null,
        amount: amount ? parseFloat(amount) : null,
        status: "PENDING",
      },
    });

    // Notification à l'équipe support (optionnel)
    // await notifySupportTeam(dispute)

    return NextResponse.json(dispute, { status: 201 });
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du litige" },
      { status: 500 },
    );
  }
}
