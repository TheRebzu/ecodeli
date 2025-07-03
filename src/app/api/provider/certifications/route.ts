import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const certificationSchema = z.object({
  providerId: z.string().cuid(),
  name: z.string().min(3, "Le nom de la certification doit faire au moins 3 caractères"),
  type: z.enum(["DRIVING_LICENSE", "PROFESSIONAL_CARD", "INSURANCE", "TRAINING_CERTIFICATE", "HEALTH_CERTIFICATE", "BACKGROUND_CHECK", "FIRST_AID", "LANGUAGE_CERTIFICATE", "OTHER"]),
  issuingOrganization: z.string().min(2, "L'organisation émettrice doit faire au moins 2 caractères"),
  certificationNumber: z.string().min(1, "Le numéro de certification est requis"),
  issuedDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Date d'émission invalide"),
  expirationDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), "Date d'expiration invalide"),
  serviceTypes: z.array(z.string()).default([]),
});

// GET - Récupérer les certifications d'un prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Vérifier les permissions - accepter soit l'ID du provider soit l'ID de l'utilisateur
    let provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: { userId: providerId },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && provider.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Récupérer les certifications liées aux documents
    const documents = await prisma.document.findMany({
      where: { 
        userId: provider.userId,
        type: {
          in: ["DRIVING_LICENSE", "INSURANCE", "CERTIFICATION", "OTHER"]
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transformer les documents en format certifications
    const certifications = documents.map(doc => ({
      id: doc.id,
      name: getCertificationName(doc.type),
      type: doc.type,
      issuingOrganization: "À renseigner", // Peut être ajouté dans metadata du document
      certificationNumber: doc.originalName || doc.filename,
      issuedDate: doc.createdAt.toISOString(),
      expirationDate: doc.expirationDate?.toISOString(),
      validationStatus: doc.validationStatus,
      validationNotes: doc.rejectionReason,
      documentUrl: doc.url,
      isRequired: isRequiredCertification(doc.type),
      serviceTypes: [], // Peut être ajouté dans metadata
      createdAt: doc.createdAt.toISOString(),
    }));

    return NextResponse.json({ certifications });
  } catch (error) {
    console.error("Error fetching provider certifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Créer/enregistrer une nouvelle certification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = certificationSchema.parse(body);

    // Vérifier que le provider existe et appartient à l'utilisateur - accepter userId ou providerId
    let provider = await prisma.provider.findFirst({
      where: {
        id: validatedData.providerId,
        userId: session.user.id,
      },
    });

    // Si pas trouvé par providerId, essayer par userId
    if (!provider) {
      provider = await prisma.provider.findFirst({
        where: {
          userId: validatedData.providerId,
        },
      });
      
      // Vérifier que ce provider appartient bien à l'utilisateur connecté
      if (provider && provider.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Créer un document de certification
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: validatedData.type,
        filename: `certification_${validatedData.type}_${Date.now()}.pdf`,
        originalName: validatedData.name,
        mimeType: "application/pdf",
        size: 0, // Sera mis à jour lors de l'upload du fichier
        url: "", // Sera mis à jour lors de l'upload du fichier
        validationStatus: "PENDING",
        expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : null,
      },
    });

    // Créer une notification pour validation
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "CERTIFICATION_CREATED",
        title: "Certification enregistrée",
        message: `Votre certification ${validatedData.name} a été enregistrée. N'oubliez pas de télécharger le document justificatif.`,
        data: {
          documentId: document.id,
          certificationType: validatedData.type,
          certificationName: validatedData.name,
        },
      },
    });

    return NextResponse.json({
      message: "Certification créée avec succès",
      certification: {
        id: document.id,
        name: validatedData.name,
        type: validatedData.type,
        validationStatus: document.validationStatus,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating provider certification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fonctions helper
function getCertificationName(type: string): string {
  const names: Record<string, string> = {
    DRIVING_LICENSE: "Permis de conduire",
    PROFESSIONAL_CARD: "Carte professionnelle",
    INSURANCE: "Assurance professionnelle",
    TRAINING_CERTIFICATE: "Certificat de formation",
    HEALTH_CERTIFICATE: "Certificat médical",
    BACKGROUND_CHECK: "Casier judiciaire",
    FIRST_AID: "Premiers secours",
    LANGUAGE_CERTIFICATE: "Certificat de langue",
    OTHER: "Autre certification",
  };
  return names[type] || "Certification";
}

function isRequiredCertification(type: string): boolean {
  return ["DRIVING_LICENSE", "INSURANCE", "BACKGROUND_CHECK"].includes(type);
}
