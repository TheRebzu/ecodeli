import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { merchantRegisterSchema } from '@/features/auth/schemas/auth.schema'
import { hash } from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation des données
    const validatedData = merchantRegisterSchema.parse(body)
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      )
    }
    
    // Hasher le mot de passe
    const hashedPassword = await hash(validatedData.password, 12)
    
    // Créer l'utilisateur et son profil commerçant
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        role: 'MERCHANT',
        merchantProfile: {
          create: {
            businessName: validatedData.businessName,
            businessType: validatedData.businessType,
            siret: validatedData.siret,
            address: validatedData.address,
            verificationStatus: 'PENDING',
            commissionRate: 0.05 // 5% par défaut
          }
        }
      },
      include: {
        merchantProfile: true
      }
    })
    
    // Retourner les données utilisateur (sans le mot de passe)
    const { password, ...userWithoutPassword } = user
    
    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Compte commerçant créé avec succès'
    })
    
  } catch (error) {
    console.error('Erreur inscription commerçant:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}