import { NextRequest, NextResponse } from "next/server"
import { signIn, COOKIE_NAME } from "@/lib/auth-simple"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const result = await signIn(email, password)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    // Créer la réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      user: result.user
    })

    // Définir le cookie HttpOnly sécurisé
    response.cookies.set(COOKIE_NAME, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/"
    })

    return response

  } catch (error) {
    console.error("Erreur login API:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
} 