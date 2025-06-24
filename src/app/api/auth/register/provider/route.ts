import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { providerRegisterSchema } from "@/features/auth/schemas/auth.schema"

/**
 * POST - Inscription Prestataire avec profil spécialisé
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation des données
    const validatedData = providerRegisterSchema.parse(body)
    
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      )
    }
    
    // Créer l'utilisateur avec Better-Auth
    const signUpResult = await auth.api.signUp({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
        phone: validatedData.phone,
        role: "PROVIDER",
        status: "PENDING" // En attente de validation
      }
    })
    
    if (!signUpResult.user) {
      return NextResponse.json(
        { error: "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }
    
    // Créer le profil prestataire
    await prisma.providerProfile.create({
      data: {
        userId: signUpResult.user.id,
        businessName: validatedData.businessName,
        specializations: validatedData.specialties,
        hourlyRate: validatedData.hourlyRate,
        description: validatedData.description,
        isVerified: false,
        autoInvoicing: true,
        rating: 0,
        totalJobs: 0
      }
    })
    
    // Créer le calendrier de disponibilité par défaut
    const defaultSchedule = {
      monday: { isWorking: true, startTime: "09:00", endTime: "18:00" },
      tuesday: { isWorking: true, startTime: "09:00", endTime: "18:00" },
      wednesday: { isWorking: true, startTime: "09:00", endTime: "18:00" },
      thursday: { isWorking: true, startTime: "09:00", endTime: "18:00" },
      friday: { isWorking: true, startTime: "09:00", endTime: "18:00" },
      saturday: { isWorking: false, startTime: "09:00", endTime: "18:00" },
      sunday: { isWorking: false, startTime: "09:00", endTime: "18:00" }
    }
    
    await prisma.providerSchedule.create({
      data: {
        userId: signUpResult.user.id,
        schedule: defaultSchedule,
        timezone: "Europe/Paris"
      }
    })
    
    return NextResponse.json({
      message: "Demande d'inscription prestataire créée avec succès",
      user: {
        id: signUpResult.user.id,
        email: signUpResult.user.email,
        role: signUpResult.user.role,
        status: "PENDING"
      },
      nextSteps: [
        "Télécharger vos certifications/habilitations",
        "Définir vos services proposés",
        "Configurer votre calendrier de disponibilité",
        "Attendre la validation par notre équipe"
      ],
      specializations: validatedData.specialties,
      hourlyRate: validatedData.hourlyRate
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Erreur inscription prestataire:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 