import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateSecret } from "@/lib/totp";

export async function GET(req: NextRequest) {
  try {
    // Check user authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    // Generate TOTP secret
    const secret = generateSecret();
    
    // Save secret to user but don't enable MFA yet
    // MFA will be enabled after verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: secret.base32
      }
    });
    
    const otpauth_url = `otpauth://totp/EcoDeli:${user.email}?secret=${secret.base32}&issuer=EcoDeli`;
    
    return NextResponse.json({
      secret: secret.base32,
      otpauth_url: otpauth_url
    });
    
  } catch (error) {
    console.error("Erreur lors de la configuration MFA:", error);
    return NextResponse.json(
      { error: "Erreur lors de la configuration MFA" },
      { status: 500 }
    );
  }
} 