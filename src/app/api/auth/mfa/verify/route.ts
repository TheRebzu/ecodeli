import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { verifyToken, generateBackupCodes, hashBackupCode } from "@/lib/totp";

// Schema for validating MFA verification request
const mfaVerifySchema = z.object({
  token: z.string().length(6)
});

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Validate request body
    const body = await req.json();
    const validation = mfaVerifySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Code invalide", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { token } = validation.data;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: "L'authentification à deux facteurs est déjà activée" },
        { status: 400 }
      );
    }
    
    // Check if user has a secret
    if (!user.mfaSecret) {
      return NextResponse.json(
        { error: "La configuration MFA n'a pas été initiée" },
        { status: 400 }
      );
    }
    
    // Verify token
    const isValid = verifyToken(token, user.mfaSecret);
    
    if (!isValid) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }
    
    // Generate backup codes if none exist
    let backupCodes = [];
    if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
      const codes = generateBackupCodes(10);
      backupCodes = codes;
      
      // Hash the backup codes before storing
      const hashedCodes = codes.map(hashBackupCode);
      
      // Enable MFA and store backup codes
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          mfaBackupCodes: hashedCodes
        }
      });
    } else {
      // Just enable MFA
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true
        }
      });
    }
    
    return NextResponse.json({
      message: "L'authentification à deux facteurs a été activée avec succès",
      backupCodes: backupCodes.length > 0 ? backupCodes : undefined
    });
    
  } catch (error) {
    console.error("Erreur lors de la vérification MFA:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification MFA" },
      { status: 500 }
    );
  }
} 