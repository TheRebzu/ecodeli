import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: "Email invalide",
      }, { status: 400 });
    }

    const { email } = validationResult.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // To prevent email enumeration, don't reveal that the user doesn't exist
      return NextResponse.json({
        success: true,
        message: "Si un compte existe avec cet email, les instructions de réinitialisation ont été envoyées",
      });
    }

    // Generate reset token
    const token = randomUUID();
    const expires = new Date(Date.now() + 3600000); // Token valid for 1 hour

    // Save token to database
    await prisma.passwordResetToken.upsert({
      where: { identifier: email },
      update: {
        token,
        expires,
      },
      create: {
        identifier: email,
        token,
        expires,
      },
    });

    // In a real application, you'd send an email with the reset link
    // Example: await sendResetEmail(email, token);
    
    // For now, we'll just log it to the console
    console.log(`Password reset token for ${email}: ${token}`);

    return NextResponse.json({
      success: true,
      message: "Si un compte existe avec cet email, les instructions de réinitialisation ont été envoyées",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({
      success: false,
      message: "Une erreur est survenue lors de la réinitialisation du mot de passe",
    }, { status: 500 });
  }
} 