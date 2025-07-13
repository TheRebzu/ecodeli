import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || user.id;

    // Vérifier les permissions
    if (userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le profil livreur
    const deliverer = await db.deliverer.findFirst({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
            documents: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!deliverer) {
      return NextResponse.json({ application: null });
    }

    // Calculer le progrès de validation
    const requiredDocuments = ["IDENTITY", "DRIVING_LICENSE", "INSURANCE"]; // Documents obligatoires seulement
    const optionalDocuments = ["VEHICLE_REGISTRATION", "CERTIFICATION"]; // Documents optionnels

    // Compter les documents requis uploadés et approuvés
    const uploadedRequiredDocs = deliverer.user.documents.filter((d) =>
      requiredDocuments.includes(d.type),
    ).length;
    const approvedRequiredDocs = deliverer.user.documents.filter(
      (d) =>
        requiredDocuments.includes(d.type) && d.validationStatus === "APPROVED",
    ).length;

    // Compter les documents optionnels approuvés (bonus)
    const approvedOptionalDocs = deliverer.user.documents.filter(
      (d) =>
        optionalDocuments.includes(d.type) && d.validationStatus === "APPROVED",
    ).length;

    // Calcul de la progression : 50% pour upload des documents requis + 50% pour approbation
    let validationProgress = 0;
    validationProgress +=
      Math.min(uploadedRequiredDocs / requiredDocuments.length, 1) * 50; // 50% pour upload
    validationProgress +=
      (approvedRequiredDocs / requiredDocuments.length) * 50; // 50% pour approbation

    // Bonus pour documents optionnels approuvés (max 10%)
    const optionalBonus = Math.min(approvedOptionalDocs * 5, 10); // 5% par document optionnel, max 10%
    validationProgress += optionalBonus;

    // Limiter à 100%
    validationProgress = Math.min(validationProgress, 100);

    // Vérifier si l'utilisateur devrait être automatiquement certifié
    const shouldBeCertified = approvedRequiredDocs === requiredDocuments.length;
    const currentStatus = deliverer.validationStatus;

    // Si tous les documents requis sont approuvés et que le statut n'est pas déjà APPROVED, le mettre à jour
    if (shouldBeCertified && currentStatus !== "APPROVED") {
      await db.deliverer.update({
        where: { id: deliverer.id },
        data: {
          validationStatus: "APPROVED",
          isActive: true,
        },
      });

      // Mettre à jour le statut utilisateur aussi
      await db.user.update({
        where: { id: userId },
        data: {
          validationStatus: "VALIDATED",
          isActive: true,
        },
      });

      // Notification d'activation automatique
      console.log(
        `Livreur ${userId} automatiquement certifié - tous les documents requis approuvés`,
      );
    }

    const transformedApplication = {
      id: deliverer.id,
      status: shouldBeCertified ? "APPROVED" : deliverer.validationStatus,
      personalInfo: {
        firstName: deliverer.user.profile?.firstName || "",
        lastName: deliverer.user.profile?.lastName || "",
        email: deliverer.user.email,
        phone: deliverer.user.profile?.phone || "",
        address: deliverer.user.profile?.address || "",
        dateOfBirth:
          deliverer.user.profile?.dateOfBirth?.toISOString().split("T")[0] ||
          "",
        nationality: deliverer.user.profile?.country || "FR",
      },
      professionalInfo: {
        vehicleType: deliverer.vehicleType || "",
        vehicleModel: deliverer.licensePlate || "",
        licenseNumber: deliverer.licensePlate || "",
        experience: deliverer.totalDeliveries || 0,
        availability: deliverer.availability || [],
        preferredZones: deliverer.preferredZones || [],
      },
      documents: deliverer.user.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: getDocumentTypeName(doc.type),
        fileName: doc.filename,
        status: doc.validationStatus,
        uploadedAt: doc.createdAt.toISOString(),
        rejectionReason: doc.rejectionReason,
        downloadUrl: `/api/documents/${doc.id}/download`,
      })),
      createdAt: deliverer.createdAt.toISOString(),
      updatedAt: deliverer.updatedAt.toISOString(),
      submittedAt:
        deliverer.validationStatus === "APPROVED"
          ? deliverer.updatedAt.toISOString()
          : null,
      reviewedAt:
        deliverer.validationStatus === "APPROVED"
          ? deliverer.updatedAt.toISOString()
          : null,
      rejectionReason:
        deliverer.validationStatus === "REJECTED"
          ? "Documents incomplets ou invalides"
          : null,
      validationProgress: Math.round(validationProgress),
    };

    return NextResponse.json({ application: transformedApplication });
  } catch (error) {
    console.error("Error fetching recruitment application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { userId, personalInfo, professionalInfo, submit } = data;

    // Vérifier les permissions
    if (userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier si un profil livreur existe déjà
    let deliverer = await db.deliverer.findFirst({
      where: { userId },
    });

    // Mettre à jour ou créer le profil utilisateur
    await db.profile.upsert({
      where: { userId },
      update: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        phone: personalInfo.phone,
        address: personalInfo.address,
        dateOfBirth: personalInfo.dateOfBirth
          ? new Date(personalInfo.dateOfBirth)
          : null,
        country: personalInfo.nationality,
      },
      create: {
        userId,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        phone: personalInfo.phone,
        address: personalInfo.address,
        dateOfBirth: personalInfo.dateOfBirth
          ? new Date(personalInfo.dateOfBirth)
          : null,
        country: personalInfo.nationality,
      },
    });

    const delivererData = {
      userId,
      vehicleType: professionalInfo.vehicleType,
      licensePlate: professionalInfo.licenseNumber,
      maxWeight: professionalInfo.maxWeight || 50,
      maxVolume: professionalInfo.maxVolume || 100,
      validationStatus: submit ? "PENDING" : "PENDING",
      availability: professionalInfo.availability || [],
      preferredZones: professionalInfo.preferredZones || [],
    };

    if (deliverer) {
      // Ne permettre la modification que si le statut le permet
      if (deliverer.validationStatus === "APPROVED") {
        return NextResponse.json(
          { error: "Cannot modify approved application" },
          { status: 400 },
        );
      }

      deliverer = await db.deliverer.update({
        where: { id: deliverer.id },
        data: delivererData,
      });
    } else {
      deliverer = await db.deliverer.create({
        data: delivererData,
      });
    }

    // Si soumis, créer une notification pour les admins
    if (submit) {
      const admins = await db.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      const notifications = admins.map((admin) => ({
        userId: admin.id,
        type: "SYSTEM" as const,
        title: "Nouvelle candidature livreur",
        message: `${personalInfo.firstName} ${personalInfo.lastName} a soumis une candidature de livreur`,
        priority: "MEDIUM" as const,
        metadata: { delivererId: deliverer.id },
      }));

      await db.notification.createMany({
        data: notifications,
      });
    }

    return NextResponse.json({
      success: true,
      applicationId: deliverer.id,
      message: submit
        ? "Application submitted successfully"
        : "Application saved successfully",
    });
  } catch (error) {
    console.error("Error saving recruitment application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function getDocumentTypeName(type: string): string {
  const documentTypes = {
    IDENTITY: "Pièce d'identité",
    DRIVING_LICENSE: "Permis de conduire",
    VEHICLE_REGISTRATION: "Carte grise",
    INSURANCE: "Attestation d'assurance",
    CERTIFICATION: "Certifications professionnelles",
    CONTRACT: "Contrat",
  };

  return documentTypes[type as keyof typeof documentTypes] || type;
}
