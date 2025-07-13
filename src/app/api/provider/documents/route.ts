import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/provider/documents
 * Récupérer les documents d'un prestataire avec résumé
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 },
      );
    }

    // Récupérer les documents du prestataire
    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        type: { in: ["IDENTITY", "CERTIFICATION", "INSURANCE", "CONTRACT"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    // Documents requis pour les prestataires
    const requiredDocuments = ["IDENTITY", "CERTIFICATION"];

    // Calculer le résumé
    const approvedDocs = documents.filter(
      (doc) => doc.validationStatus === "APPROVED",
    );
    const pendingDocs = documents.filter(
      (doc) => doc.validationStatus === "PENDING",
    );
    const rejectedDocs = documents.filter(
      (doc) => doc.validationStatus === "REJECTED",
    );

    // Documents manquants (requis mais pas approuvés)
    const missing = requiredDocuments.filter(
      (requiredType) => !approvedDocs.some((doc) => doc.type === requiredType),
    );

    // Peut être activé si tous les documents requis sont approuvés
    const canActivate = requiredDocuments.every((requiredType) =>
      approvedDocs.some((doc) => doc.type === requiredType),
    );

    const summary = {
      total: documents.length,
      approved: approvedDocs.length,
      pending: pendingDocs.length,
      rejected: rejectedDocs.length,
      requiredDocuments,
      missing,
      canActivate,
    };

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        filename: doc.filename,
        originalName: doc.originalName,
        url: doc.url,
        validationStatus: doc.validationStatus,
        validatedBy: doc.validatedBy,
        validatedAt: doc.validatedAt,
        rejectionReason: doc.rejectionReason,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      summary,
    });
  } catch (error) {
    console.error("Erreur récupération documents prestataire:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
