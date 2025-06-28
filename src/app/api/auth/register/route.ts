import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  phone: z.string().min(10, "Le numéro de téléphone est requis"),
  role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']),
  // Champs spécifiques selon le rôle
  companyName: z.string().optional(),
  siret: z.string().optional(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Inscription tentée pour:", body.email, "- Rôle:", body.role)
    
    const validatedData = registerSchema.parse(body)
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role,
      companyName,
      siret,
      businessName,
      address,
      city,
      postalCode
    } = validatedData

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 400 }
      )
    }

    // Validation des champs obligatoires selon le rôle
    if (role === 'MERCHANT' && (!companyName || !siret)) {
      return NextResponse.json(
        { error: "Le nom de l'entreprise et le SIRET sont requis pour les commerçants" },
        { status: 400 }
      )
    }

    if (role === 'PROVIDER' && !businessName) {
      return NextResponse.json(
        { error: "Le nom de l'activité est requis pour les prestataires" },
        { status: 400 }
      )
    }

    // Vérifier l'unicité du SIRET pour les merchants
    if (role === 'MERCHANT' && siret) {
      const existingMerchant = await db.merchant.findFirst({
        where: { siret }
      })
      
      if (existingMerchant) {
        return NextResponse.json(
          { error: "Ce SIRET est déjà utilisé" },
          { status: 400 }
        )
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(password, 12)

    // Créer l'utilisateur avec transaction pour assurer la cohérence
    const result = await db.$transaction(async (tx) => {
      // Créer l'utilisateur principal
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: `${firstName} ${lastName}`,
          role: role as any,
          // Statut selon le cahier des charges
          isActive: role === 'CLIENT' || role === 'ADMIN', // Clients et admins actifs immédiatement
          emailVerified: null,
          profile: {
            create: {
              firstName,
              lastName,
              phone,
              address: address || null,
              city: city || null,
              postalCode: postalCode || null,
              country: 'FR',
              isVerified: false
            }
          }
        }
      })

      console.log("✅ Utilisateur créé:", user.id, user.email)

      // Créer le profil spécifique selon le rôle (cahier des charges)
      switch (role) {
        case 'CLIENT':
          await tx.client.create({
            data: {
              userId: user.id,
              subscriptionPlan: 'FREE',
              tutorialCompleted: false, // Tutoriel obligatoire première connexion
              termsAcceptedAt: new Date(),
              emailNotifications: true,
              pushNotifications: true,
              smsNotifications: false
            }
          })
          console.log("✅ Profil CLIENT créé")
          break

        case 'DELIVERER':
          // Livreur doit être validé par la société (cahier des charges)
          await tx.deliverer.create({
            data: {
              userId: user.id,
              validationStatus: 'PENDING', // Validation requise
              isActive: false, // Inactif jusqu'à validation
              averageRating: 0,
              totalDeliveries: 0
            }
          })
          
          // Créer le wallet pour les paiements (cahier des charges)
          await tx.wallet.create({
            data: {
              userId: user.id,
              balance: 0,
              currency: 'EUR'
            }
          })
          console.log("✅ Profil DELIVERER créé avec wallet")
          break

        case 'PROVIDER':
          // Prestataire doit être rigoureusement sélectionné (cahier des charges)
          await tx.provider.create({
            data: {
              userId: user.id,
              validationStatus: 'PENDING', // Vérification du profil par l'entreprise
              businessName: businessName!,
              isActive: false, // Inactif jusqu'à validation
              specialties: [], // Types de prestations à valider
              averageRating: 0,
              totalBookings: 0,
              monthlyInvoiceDay: 30 // Facturation automatique fin de mois
            }
          })
          
          // Wallet pour les virements bancaires mensuels (cahier des charges)
          await tx.wallet.create({
            data: {
              userId: user.id,
              balance: 0,
              currency: 'EUR'
            }
          })
          console.log("✅ Profil PROVIDER créé avec wallet")
          break

        case 'MERCHANT':
          // Commerçant doit avoir un contrat (cahier des charges)
          await tx.merchant.create({
            data: {
              userId: user.id,
              companyName: companyName!,
              siret: siret!,
              contractStatus: 'PENDING', // Contrat à valider
              commissionRate: 0.15, // Taux de commission EcoDeli
              rating: 0
            }
          })
          console.log("✅ Profil MERCHANT créé")
          break

        case 'ADMIN':
          // Admin actif immédiatement avec toutes les permissions
          await tx.admin.create({
            data: {
              userId: user.id,
              permissions: ['MANAGE_USERS', 'MANAGE_PLATFORM', 'MANAGE_FINANCE', 'MANAGE_CONTRACTS'],
              department: 'GENERAL'
            }
          })
          console.log("✅ Profil ADMIN créé")
          break
      }

      return user
    })

    // Réponse selon le rôle et statut
    const responseMessage = getRegistrationMessage(role)
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        isActive: result.isActive,
        validationStatus: result.validationStatus
      }
    })

  } catch (error) {
    console.error("❌ Erreur inscription:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Données invalides", 
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      )
    }

    // Erreur de contrainte unique (SIRET, email, etc.)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Cette information est déjà utilisée par un autre compte" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    )
  }
}

// Messages selon le cahier des charges
function getRegistrationMessage(role: string): string {
  switch (role) {
    case 'CLIENT':
      return "Compte client créé avec succès. Vous pouvez maintenant vous connecter et découvrir nos services."
    
    case 'DELIVERER':
      return "Demande de livreur enregistrée. Votre profil sera validé par notre équipe après vérification de vos pièces justificatives."
    
    case 'PROVIDER':
      return "Candidature prestataire enregistrée. Notre équipe va vérifier votre profil et vos habilitations avant validation."
    
    case 'MERCHANT':
      return "Demande commerçant enregistrée. Nous allons prendre contact avec vous pour établir le contrat de partenariat."
    
    case 'ADMIN':
      return "Compte administrateur créé avec succès. Accès complet à la plateforme EcoDeli."
    
    default:
      return "Inscription réalisée avec succès."
  }
}