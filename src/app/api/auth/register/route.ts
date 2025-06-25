import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { registerSchema } from '@/features/auth/schemas/register.schema'
// import { sendNotification } from '@/features/notifications/services/notification.service'

/**
 * POST /api/auth/register
 * Inscription selon les 5 rôles EcoDeli avec processus de validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Inscription EcoDeli - Rôle:', body.role)
    
    // Validation des données
    const validatedData = registerSchema.parse(body)
    
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // Créer l'utilisateur avec Better-Auth (inclut Account automatiquement)
    const authResult = await auth.api.signUpEmail({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        role: validatedData.role,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        language: 'fr'
      }
    })

    if (!authResult.data) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    const user = authResult.data.user

    // Créer le profil général obligatoire (si pas déjà créé par Better-Auth)
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: user.id }
    })
    
    if (!existingProfile) {
      await prisma.profile.create({
        data: {
          userId: user.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone,
          country: 'FR'
        }
      })
    }

    // Créer le profil spécialisé selon le rôle
    await createRoleSpecificProfile(user.id, validatedData.role)

    // TODO: Envoyer notification d'inscription
    // await sendWelcomeNotification(user)

    // TODO: Si livreur ou prestataire, notifier admin pour validation
    // if (validatedData.role === 'DELIVERER' || validatedData.role === 'PROVIDER') {
    //   await notifyAdminForValidation(user)
    // }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      message: getRoleSpecificMessage(validatedData.role)
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur inscription EcoDeli:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'inscription' },
      { status: 500 }
    )
  }
}

/**
 * Déterminer le statut initial selon le rôle
 */
function getInitialStatus(role: string): string {
  switch (role) {
    case 'CLIENT':
      return 'ACTIVE' // Clients activés immédiatement
    case 'DELIVERER':
    case 'PROVIDER':
      return 'PENDING' // Validation documents obligatoire
    case 'MERCHANT':
      return 'PENDING' // Validation contrat obligatoire
    case 'ADMIN':
      return 'ACTIVE'
    default:
      return 'PENDING'
  }
}

/**
 * Créer le profil spécialisé selon le rôle EcoDeli
 */
async function createRoleSpecificProfile(userId: string, role: string) {
  switch (role) {
    case 'CLIENT':
      // Espace clients : tutoriel obligatoire première connexion
      await prisma.client.create({
        data: {
          userId,
          subscriptionPlan: 'FREE', // Plan gratuit par défaut
          tutorialCompleted: false, // OBLIGATOIRE : tutoriel bloquant
          termsAcceptedAt: new Date()
        }
      })
      break

    case 'DELIVERER':
      // Espace livreurs : validation documents obligatoire
      await prisma.deliverer.create({
        data: {
          userId,
          validationStatus: 'PENDING', // Documents à valider
          maxWeight: 30.0, // 30kg par défaut
          maxVolume: 50.0, // 50L par défaut
          isActive: false // Indisponible jusqu'à validation
        }
      })
      
      // Créer wallet pour paiements livreur
      await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'EUR'
        }
      })
      break

    case 'MERCHANT':
      // Espace commerçants : contrat obligatoire
      await prisma.merchant.create({
        data: {
          userId,
          companyName: 'Entreprise à définir', // À compléter lors onboarding
          siret: `TEMP_${Date.now()}`, // SIRET temporaire unique
          contractStatus: 'PENDING' // Contrat à signer
        }
      })
      break

    case 'PROVIDER':
      // Espace prestataires : validation rigoureuse
      await prisma.provider.create({
        data: {
          userId,
          validationStatus: 'PENDING', // Vérification profil obligatoire
          monthlyInvoiceDay: 30, // Facturation automatique le 30
          hourlyRate: 0, // Tarif à négocier
          isActive: false // Inactif jusqu'à validation
        }
      })
      
      // Créer wallet pour paiements prestataire
      await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'EUR'
        }
      })
      break

    case 'ADMIN':
      // Back office administration : accès complet
      await prisma.admin.create({
        data: {
          userId,
          permissions: ['ALL'], // Permissions complètes
          department: 'OPERATIONS' // Département par défaut
        }
      })
      break
  }
}

/**
 * Messages spécifiques selon le rôle
 */
function getRoleSpecificMessage(role: string): string {
  switch (role) {
    case 'CLIENT':
      return 'Compte client créé ! Vous pouvez maintenant déposer des annonces et réserver des services.'
    case 'DELIVERER':
      return 'Demande de livreur enregistrée ! Veuillez télécharger vos documents justificatifs pour validation.'
    case 'MERCHANT':
      return 'Demande commerçant enregistrée ! Un contrat vous sera proposé sous 48h.'
    case 'PROVIDER':
      return 'Candidature prestataire reçue ! Votre profil sera vérifié par notre équipe.'
    case 'ADMIN':
      return 'Compte administrateur créé avec succès.'
    default:
      return 'Compte créé avec succès !'
  }
}

/**
 * Notification de bienvenue personnalisée
 * TODO: Activer quand le service de notification sera prêt
 */
// async function sendWelcomeNotification(user: any) {
//   try {
//     await sendNotification({
//       userId: user.id,
//       title: `Bienvenue sur EcoDeli !`,
//       message: `Votre compte ${user.role.toLowerCase()} a été créé avec succès.`,
//       type: 'SYSTEM'
//     })
//   } catch (error) {
//     console.error('Erreur notification bienvenue:', error)
//   }
// }

/**
 * Notifier admin pour validation documents
 * TODO: Activer quand le service de notification sera prêt
 */
// async function notifyAdminForValidation(user: any) {
//   try {
//     // Récupérer tous les admins
//     const admins = await prisma.user.findMany({
//       where: { role: 'ADMIN' }
//     })

//     // Notifier chaque admin
//     for (const admin of admins) {
//       await sendNotification({
//         userId: admin.id,
//         title: 'Nouvelle demande de validation',
//         message: `${user.role === 'DELIVERER' ? 'Livreur' : 'Prestataire'} ${user.firstName} ${user.lastName} en attente de validation.`,
//         type: 'VALIDATION'
//       })
//     }
//   } catch (error) {
//     console.error('Erreur notification admin:', error)
//   }
// } 