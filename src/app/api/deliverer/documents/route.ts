import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le delivererId depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const delivererId = searchParams.get("delivererId");

    // Utiliser le delivererId si fourni, sinon utiliser l'ID de la session
    const userId = delivererId || session.user.id;

    // Récupérer les documents du livreur
    const documents = await prisma.document.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Types de documents requis pour les livreurs
    const documentTypes = [
      {
        id: "IDENTITY",
        name: "Pièce d'identité",
        required: true,
        description:
          "Carte nationale d'identité ou passeport en cours de validité",
        allowedFormats: ["pdf", "jpg", "jpeg", "png"],
        maxSize: 5 * 1024 * 1024, // 5MB
      },
      {
        id: "DRIVING_LICENSE",
        name: "Permis de conduire",
        required: true,
        description: "Permis de conduire valide (catégorie B minimum)",
        allowedFormats: ["pdf", "jpg", "jpeg", "png"],
        maxSize: 5 * 1024 * 1024, // 5MB
      },
      {
        id: "INSURANCE",
        name: "Attestation d'assurance",
        required: true,
        description: "Attestation responsabilité civile véhicule",
        allowedFormats: ["pdf", "jpg", "jpeg", "png"],
        maxSize: 5 * 1024 * 1024, // 5MB
      },
      {
        id: "OTHER",
        name: "Carte grise",
        required: false,
        description: "Certificat d'immatriculation du véhicule",
        allowedFormats: ["pdf", "jpg", "jpeg", "png"],
        maxSize: 5 * 1024 * 1024, // 5MB
      },
      {
        id: "CERTIFICATION",
        name: "Certifications professionnelles",
        required: false,
        description: "Certifications ou diplômes liés au transport",
        allowedFormats: ["pdf", "jpg", "jpeg", "png"],
        maxSize: 5 * 1024 * 1024, // 5MB
      },
    ];

    // Fonction pour mapper les statuts de validation
    const mapValidationStatus = (status: string) => {
      switch (status) {
        case "APPROVED":
        case "VALIDATED":
          return "approved";
        case "REJECTED":
          return "rejected";
        case "PENDING":
        case "PENDING_DOCUMENTS":
        case "PENDING_VALIDATION":
        default:
          return "pending";
      }
    };

    // Transformer les documents pour correspondre à l'interface attendue
    const transformedDocuments = documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      name: doc.originalName || doc.filename,
      filename: doc.filename,
      status: mapValidationStatus(doc.validationStatus),
      uploadedAt: doc.createdAt.toISOString(),
      validatedAt: doc.validatedAt?.toISOString(),
      expiresAt: doc.expirationDate?.toISOString() || null,
      rejectedReason: doc.rejectionReason || null,
      size: doc.size || 0,
      url: doc.url,
    }));

    return NextResponse.json({
      documents: transformedDocuments,
      documentTypes,
    });
  } catch (error) {
    console.error("Error fetching deliverer documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
