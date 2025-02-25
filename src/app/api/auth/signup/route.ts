// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import * as z from "zod"

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phoneNumber: z.string().min(10),
  role: z.enum(["CUSTOMER", "COURIER", "MERCHANT", "PROVIDER"]),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = signUpSchema.parse(body)

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json({ message: "Cet email est déjà utilisé" }, { status: 400 })
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Créer l'utilisateur et son profil spécifique selon le rôle
    const user = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phoneNumber: validatedData.phoneNumber,
          role: validatedData.role,
          status: "PENDING",
        },
      })

      // Créer le profil spécifique selon le rôle
      switch (validatedData.role) {
        case "CUSTOMER":
          await tx.customerProfile.create({
            data: {
              userId: newUser.id,
            },
          })
          break
        case "COURIER":
          await tx.courierProfile.create({
            data: {
              userId: newUser.id,
              isVerified: false,
              documentsSubmitted: false,
            },
          })
          break
        case "MERCHANT":
          await tx.merchantProfile.create({
            data: {
              userId: newUser.id,
              companyName: "", // À remplir lors de la validation du profil
              siret: "", // À remplir lors de la validation du profil
              businessType: "", // À remplir lors de la validation du profil
              isVerified: false,
            },
          })
          break
        case "PROVIDER":
          await tx.providerProfile.create({
            data: {
              userId: newUser.id,
              services: [],
              isVerified: false,
            },
          })
          break
      }

      return newUser
    })

    // Créer un token de vérification
    const verificationToken = await prisma.verificationToken.create({
      data: {
        token: Math.random().toString(36).substr(2, 8),
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
      },
    })

    // TODO: Envoyer l'email de vérification avec le token
    // Exemple avec un service d'email (à implémenter)
    // await sendVerificationEmail({
    //   to: user.email,
    //   token: verificationToken.token,
    //   name: user.firstName,
    // });

    // Renvoyer la réponse sans les données sensibles
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
        user: userWithoutPassword,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Signup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'Données invalides',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        },
        { status: 400 }
      );
    }

    // Gérer les erreurs Prisma
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Cette information existe déjà dans notre base de données' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
