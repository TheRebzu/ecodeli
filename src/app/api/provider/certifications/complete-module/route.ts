import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProviderValidationService } from "@/features/provider/services/validation.service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { providerId, certificationId, moduleId, score } = body;

    if (!providerId || !certificationId || !moduleId || score === undefined) {
      return NextResponse.json(
        { error: "Tous les paramètres sont requis" },
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

    // Compléter le module
    const result = await ProviderValidationService.completeModule(
      providerId,
      certificationId,
      moduleId,
      score,
    );

    return NextResponse.json({
      success: true,
      message: "Module complété avec succès",
      ...result,
    });
  } catch (error) {
    console.error("Erreur complétion module:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la complétion du module" },
      { status: 500 },
    );
  }
}
