import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Code requis" }, { status: 400 });
    }

    // Rechercher le code de parrainage
    const referralCode = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        program: true,
      },
    });

    if (!referralCode) {
      return NextResponse.json({
        valid: false,
        message: "Code de parrainage non trouvé",
      });
    }

    // Vérifier si le code est actif
    if (!referralCode.isActive) {
      return NextResponse.json({
        valid: false,
        message: "Code de parrainage inactif",
      });
    }

    // Vérifier la date d'expiration
    const now = new Date();
    if (referralCode.expiresAt && referralCode.expiresAt < now) {
      return NextResponse.json({
        valid: false,
        isExpired: true,
        message: "Code de parrainage expiré",
      });
    }

    // Vérifier la limite d'utilisation
    if (
      referralCode.maxUsage &&
      referralCode.usageCount >= referralCode.maxUsage
    ) {
      return NextResponse.json({
        valid: false,
        isMaxUsage: true,
        message: "Code de parrainage épuisé",
      });
    }

    // Code valide - retourner les informations
    const referrerName = referralCode.user.profile?.firstName
      ? `${referralCode.user.profile.firstName} ${referralCode.user.profile.lastName || ""}`.trim()
      : referralCode.user.email;

    return NextResponse.json({
      valid: true,
      referrerName,
      bonusAmount: referralCode.program?.refereeReward || 10, // Bonus par défaut
      message: "Code de parrainage valide",
    });
  } catch (error) {
    console.error("Erreur validation code parrainage:", error);
    return NextResponse.json(
      { error: "Erreur lors de la validation du code" },
      { status: 500 },
    );
  }
}
