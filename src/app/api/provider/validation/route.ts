import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProviderValidationService } from "@/features/provider/services/validation.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "ID prestataire requis" },
        { status: 400 },
      );
    }

    // Vérifier que l'utilisateur peut accéder à ce prestataire
    if (session.user.role !== "ADMIN" && session.user.id !== providerId) {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true },
      });

      if (!provider || provider.userId !== session.user.id) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    // Récupérer les données de validation
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        services: true,
        certifications: true,
        documents: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Prestataire non trouvé" },
        { status: 404 },
      );
    }

    // Récupérer le statut de validation
    const validationStatus =
      await ProviderValidationService.getValidationStatus(providerId);

    return NextResponse.json({
      provider,
      validationStatus,
    });
  } catch (error) {
    console.error("Erreur récupération validation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de validation" },
      { status: 500 },
    );
  }
}
