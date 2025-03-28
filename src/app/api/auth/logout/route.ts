import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Check if there's an active session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({
        message: "Déjà déconnecté"
      });
    }
    
    // Get session token from cookie
    const sessionToken = req.cookies.get("next-auth.session-token")?.value;
    
    // If we have a session token, remove it from the database
    if (sessionToken) {
      await prisma.session.deleteMany({
        where: {
          sessionToken: sessionToken
        }
      });
    }
    
    // Log the logout attempt
    if (session.user.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastLogin: new Date() }
      });
    }
    
    // The frontend will handle the actual session clearing via signOut() from next-auth
    return NextResponse.json({
      message: "Déconnexion réussie"
    });
    
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
} 