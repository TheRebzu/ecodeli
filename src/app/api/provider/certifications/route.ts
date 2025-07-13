import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Récupérer les certifications du prestataire
    const certifications = await prisma.certification.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(certifications);
  } catch (error) {
    console.error("Erreur récupération certifications:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des certifications" },
      { status: 500 },
    );
  }
}
