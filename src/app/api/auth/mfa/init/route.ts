import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating MFA init request
const mfaInitSchema = z.object({
  email: z.string().email()
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request
    const body = await req.json();
    const validation = mfaInitSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { email } = validation.data;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        mfaEnabled: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Return whether MFA is enabled for this user
    return NextResponse.json({
      mfaRequired: user.mfaEnabled || false
    });
    
  } catch (error) {
    console.error("Erreur lors de l'initialisation MFA:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation MFA" },
      { status: 500 }
    );
  }
} 