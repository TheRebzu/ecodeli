import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Créer la réponse
    const response = NextResponse.json({
      success: true,
      message: "Déconnexion réussie"
    })

    // Supprimer le cookie en définissant une date d'expiration dans le passé
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/"
    })

    console.log("User logged out successfully")
    return response

  } catch (error) {
    console.error("Erreur logout API:", error)
    
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
} 