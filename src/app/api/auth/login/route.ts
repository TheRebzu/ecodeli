<<<<<<< Updated upstream
import { NextRequest, NextResponse } from "next/server"
import { signIn } from "@/lib/auth-simple"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Login attempt for:", body.email)
    
    const { email, password } = loginSchema.parse(body)

    const result = await signIn(email, password)
    console.log("Login result:", { success: result.success, error: result.error })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
=======
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'

/**
 * Schéma de validation pour la connexion
 */
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Tentative de connexion pour:', body.email)
    
    // Validation des données
    const validatedData = loginSchema.parse(body)
    
    // Connexion avec Better-Auth
    const result = await auth.api.signInEmail({
      body: {
        email: validatedData.email,
        password: validatedData.password
      },
      headers: request.headers
    })

    if (!result.data) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
>>>>>>> Stashed changes
        { status: 401 }
      )
    }

<<<<<<< Updated upstream
    // Créer la réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      user: result.user
    })

    // Définir le cookie HttpOnly sécurisé
    response.cookies.set("auth-token", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/"
    })

    console.log("Login successful for:", result.user?.email)
    return response

  } catch (error) {
    console.error("Erreur login API:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
=======
    const response = NextResponse.json({
      success: true,
      user: result.data.user,
      message: 'Connexion réussie'
    })

    // Définir le cookie de session
    if (result.data.session) {
      response.cookies.set('better-auth.session_token', result.data.session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 jours
      })
    }

    return response

  } catch (error) {
    console.error('Erreur connexion:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors
        },
        { status: 422 }
>>>>>>> Stashed changes
      )
    }

    return NextResponse.json(
<<<<<<< Updated upstream
      { error: "Erreur serveur" },
=======
      { error: 'Erreur serveur lors de la connexion' },
>>>>>>> Stashed changes
      { status: 500 }
    )
  }
} 