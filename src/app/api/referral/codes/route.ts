import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ReferralService } from "@/features/referral/services/referral.service";

const generateCodeSchema = z.object({
  programId: z.string().min(1, "Program ID requis"),
  customCode: z.string().min(3).max(20).optional(),
});

const useCodeSchema = z.object({
  code: z.string().min(3, "Code requis"),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST - Générer un code de parrainage ou utiliser un code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "generate") {
      // Générer un code de parrainage
      const validatedData = generateCodeSchema.parse(data);

      const referralCode = await ReferralService.generateReferralCode(
        validatedData.programId,
        session.user.id,
        validatedData.customCode,
      );

      return NextResponse.json(
        {
          success: true,
          message: "Code de parrainage généré avec succès",
          code: {
            id: referralCode.id,
            code: referralCode.code,
            usageLimit: referralCode.usageLimit,
            usageCount: referralCode.usageCount,
            expiresAt: referralCode.expiresAt,
            createdAt: referralCode.createdAt,
          },
        },
        { status: 201 },
      );
    } else if (action === "use") {
      // Utiliser un code de parrainage
      const validatedData = useCodeSchema.parse(data);

      const referral = await ReferralService.useReferralCode(
        validatedData.code,
        session.user.id,
        validatedData.metadata,
      );

      return NextResponse.json({
        success: true,
        message: "Code de parrainage utilisé avec succès",
        referral: {
          id: referral.id,
          status: referral.status,
          createdAt: referral.createdAt,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Action non spécifiée ou invalide" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling referral code:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors du traitement du code de parrainage" },
      { status: 500 },
    );
  }
}

/**
 * GET - Récupérer les codes de parrainage d'un utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    const where: any = { referrerId: session.user.id };
    if (programId) where.programId = programId;

    const codes = await prisma.referralCode.findMany({
      where,
      include: {
        program: {
          select: {
            name: true,
            programType: true,
            isActive: true,
          },
        },
        referrals: {
          include: {
            referee: {
              include: { profile: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      codes,
    });
  } catch (error) {
    console.error("Error fetching referral codes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des codes" },
      { status: 500 },
    );
  }
}
