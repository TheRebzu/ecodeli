import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

/**
 * GET /api/auth/get-session
 * Récupère la session utilisateur via NextAuth
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: session.user,
      session: session
    })

  } catch (error) {
    console.error("❌ Erreur API /auth/get-session:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
} 