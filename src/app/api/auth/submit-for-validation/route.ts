import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { userId } = await request.json();

    // Vérifier que l'utilisateur modifie son propre profil
    if (session.user.id !== userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Vérifier que tous les documents obligatoires sont présents
    const requiredDocuments = getRequiredDocuments(session.user.role);
    if (requiredDocuments.length > 0) {
      const userDocuments = await db.document.findMany({
        where: { userId },
        select: { type: true },
      });

      const uploadedTypes = userDocuments.map(doc => doc.type);
      const missingDocuments = requiredDocuments.filter(type => !uploadedTypes.includes(type));

      if (missingDocuments.length > 0) {
        return NextResponse.json({
          error: `Documents manquants: ${missingDocuments.join(", ")}`,
        }, { status: 400 });
      }
    }

    // Mettre à jour le statut de validation selon le rôle
    await db.$transaction(async (tx) => {
      // Mettre à jour le statut général de l'utilisateur
      await tx.user.update({
        where: { id: userId },
        data: { validationStatus: "PENDING" },
      });

      // Mettre à jour le statut spécifique au rôle
      switch (session.user.role) {
        case "DELIVERER":
          await tx.deliverer.update({
            where: { userId },
            data: { validationStatus: "PENDING" },
          });
          break;
        case "PROVIDER":
          await tx.provider.update({
            where: { userId },
            data: { validationStatus: "PENDING" },
          });
          break;
        case "MERCHANT":
          await tx.merchant.update({
            where: { userId },
            data: { contractStatus: "PENDING" },
          });
          break;
      }

      // Mettre à jour le statut des documents
      await tx.document.updateMany({
        where: { userId },
        data: { validationStatus: "PENDING" },
      });
    });

    // Envoyer un email de notification à l'utilisateur
    try {
      await EmailService.sendGenericEmail(
        session.user.email,
        "Documents soumis pour validation - EcoDeli",
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Documents soumis avec succès</h2>
          <p>Bonjour ${session.user.name},</p>
          <p>Vos documents ont été soumis pour validation. Nos équipes vont les examiner sous 24-48h.</p>
          <p>Vous recevrez une notification par email une fois la validation terminée.</p>
          <p>Cordialement,<br>L'équipe EcoDeli</p>
        </div>
        `
      );
    } catch (emailError) {
      console.error("Erreur envoi email notification:", emailError);
      // Ne pas faire échouer la requête si l'email ne peut pas être envoyé
    }

    return NextResponse.json({
      success: true,
      message: "Documents soumis pour validation",
    });
  } catch (error) {
    console.error("Erreur soumission validation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function getRequiredDocuments(role: string): string[] {
  const requirements: Record<string, string[]> = {
    CLIENT: [],
    ADMIN: [],
    DELIVERER: ["IDENTITY", "INSURANCE"],
    PROVIDER: ["IDENTITY", "CERTIFICATION", "INSURANCE"],
    MERCHANT: ["IDENTITY", "CERTIFICATION", "INSURANCE"],
  };
  return requirements[role] || [];
}