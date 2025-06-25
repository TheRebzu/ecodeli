import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const adminRegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
      "Le mot de passe doit contenir: minuscule, majuscule, chiffre et caractère spécial"
    ),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z
    .string()
    .regex(/^(\+33|0)[1-9]([0-9]{8})$/, 'Format de téléphone invalide (ex: 0651168619 ou +33651168619)'),
  department: z.enum(['OPERATIONS', 'FINANCE', 'SUPPORT', 'MARKETING', 'IT']),
  permissions: z.array(z.string()).default([]),
  language: z.enum(['fr', 'en']).default('fr'),
  adminKey: z.string().min(1, 'Clé admin requise') // Sécurité supplémentaire
})

/**
 * POST - Inscription Admin (usage interne uniquement)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userData = adminRegisterSchema.parse(body)

    // Vérification clé admin (sécurité)
    const validAdminKey = process.env.ADMIN_REGISTRATION_KEY
    if (!validAdminKey || userData.adminKey !== validAdminKey) {
      return NextResponse.json(
        { error: 'Clé admin invalide' },
        { status: 403 }
      )
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Créer l'utilisateur admin
    const result = await auth.api.signUp({
      body: {
        email: userData.email,
        password: userData.password,
        role: 'ADMIN',
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        language: userData.language
      }
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    const user = result.data?.user
    if (!user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    // Créer le profil complet de l'admin
    await prisma.profile.create({
      data: {
        userId: user.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        verified: true // Admins sont pré-vérifiés
      }
    })

    // Définir les permissions par département
    const departmentPermissions = {
      OPERATIONS: ['VALIDATE_DOCUMENTS', 'MANAGE_DELIVERIES', 'MONITOR_SYSTEM'],
      FINANCE: ['MANAGE_PAYMENTS', 'GENERATE_REPORTS', 'VIEW_ANALYTICS'],
      SUPPORT: ['MANAGE_USERS', 'HANDLE_DISPUTES', 'VIEW_TICKETS'],
      MARKETING: ['MANAGE_CONTENT', 'VIEW_ANALYTICS', 'MANAGE_PROMOTIONS'],
      IT: ['SYSTEM_ADMIN', 'MANAGE_INFRASTRUCTURE', 'VIEW_LOGS']
    }

    // Créer le profil admin spécialisé
    await prisma.admin.create({
      data: {
        userId: user.id,
        department: userData.department,
        permissions: userData.permissions.length > 0 
          ? userData.permissions 
          : departmentPermissions[userData.department] || []
      }
    })

    // Log d'activité sécurisé
    console.log(`Nouvel admin créé: ${user.email} (${userData.department})`)

    return NextResponse.json({
      success: true,
      message: 'Compte administrateur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        department: userData.department,
        permissions: departmentPermissions[userData.department] || []
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating admin account:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 