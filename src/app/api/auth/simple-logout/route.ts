import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/auth-simple"

export async function POST(request: NextRequest) {
  try {
    // Créer la réponse
    const response = NextResponse.json({
      success: true,
      message: "Déconnexion réussie"
    })

    // Supprimer le cookie
    response.cookies.delete(COOKIE_NAME)

    return response

  } catch (error) {
    console.error("Erreur logout API:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Support GET pour la déconnexion aussi
  return POST(request)
} 