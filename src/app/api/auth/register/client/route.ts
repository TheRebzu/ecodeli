import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { clientRegisterSchema } from '@/features/auth/schemas/auth.schema'
import { createHash } from 'crypto'

/**
 * POST - Inscription Client avec abonnement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation des données
    const validatedData = clientRegisterSchema.parse(body)
    
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }
    
    // Créer l'utilisateur avec Better-Auth
    const signUpResult = await auth.api.signUp({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
        role: 'CLIENT'
      }
    })
    
    if (!signUpResult.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }
    
    // Créer le profil client avec abonnement
    await prisma.clientProfile.create({
      data: {
        userId: signUpResult.user.id,
        subscriptionPlan: validatedData.subscriptionPlan,
        tutorialCompleted: false,
        acceptsMarketing: validatedData.acceptsMarketing
      }
    })
    
    // Créer l'abonnement gratuit par défaut
    await prisma.subscription.create({
      data: {
        userId: signUpResult.user.id,
        plan: validatedData.subscriptionPlan,
        status: 'active',
        startDate: new Date()
      }
    })
    
    return NextResponse.json({
      message: 'Compte client créé avec succès',
      user: {
        id: signUpResult.user.id,
        email: signUpResult.user.email,
        role: signUpResult.user.role
      },
      needsTutorial: true
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erreur inscription client:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}