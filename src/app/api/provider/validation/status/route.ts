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

    // Vérifier les permissions et déterminer l'ID utilisateur à utiliser
    let userIdToUse = providerId
    
    // Si l'utilisateur n'est pas admin et que l'ID ne correspond pas à son ID
    if (session.user.role !== 'ADMIN' && session.user.id !== providerId) {
      // Vérifier si l'utilisateur peut accéder à ce prestataire
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true }
      })
      
      if (!provider || provider.userId !== session.user.id) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    // Récupérer le statut de validation en passant l'ID utilisateur
    const validationStatus = await ProviderValidationService.getValidationStatus(userIdToUse)

    return NextResponse.json(validationStatus)
  } catch (error) {
    console.error("Erreur récupération statut:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du statut" },
      { status: 500 },
    );
  }
}
