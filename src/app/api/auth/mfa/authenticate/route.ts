import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { verifyToken, verifyBackupCode } from "@/lib/totp";

// Schema for validating MFA authentication request
const mfaAuthSchema = z.object({
  token: z.string(),
  email: z.string().email(),
  isBackupCode: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
  try {
    // This endpoint doesn't require authentication as it's part of the login flow
    
    // Parse and validate the request
    const body = await req.json();
    const validation = mfaAuthSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { token, email, isBackupCode } = validation.data;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    // Check if MFA is enabled
    if (!user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: "L'authentification à deux facteurs n'est pas activée" },
        { status: 400 }
      );
    }
    
    let isValid = false;
    
    // If it's a backup code, verify against stored backup codes
    if (isBackupCode) {
      if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
        return NextResponse.json(
          { error: "Aucun code de secours disponible" },
          { status: 400 }
        );
      }
      
      const result = verifyBackupCode(token, user.mfaBackupCodes);
      isValid = result.valid;
      
      // If valid, remove the used backup code
      if (isValid && result.index !== -1) {
        const updatedBackupCodes = [...user.mfaBackupCodes];
        updatedBackupCodes.splice(result.index, 1);
        
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaBackupCodes: updatedBackupCodes }
        });
      }
    } else {
      // Verify the TOTP token
      isValid = verifyToken(token, user.mfaSecret);
    }
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Code d'authentification invalide" },
        { status: 400 }
      );
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    // If MFA is valid, return success
    return NextResponse.json({
      message: "Authentification à deux facteurs réussie",
      success: true
    });
    
  } catch (error) {
    console.error("Erreur lors de l'authentification MFA:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'authentification MFA" },
      { status: 500 }
    );
  }
} 