import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { EmailService } from "@/lib/email";
import { randomUUID } from "crypto";

// Schéma de validation pour l'inscription
const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum([
    "CLIENT",
    "DELIVERER",
    "MERCHANT",
    "PROVIDER",
    "ADMIN",
  ] as const),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("FR"),
  // Champs spécifiques prestataires
  businessName: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  hourlyRate: z.number().optional(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validatedData = registerSchema.parse(body);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 },
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Créer l'utilisateur avec transaction
    const result = await db.$transaction(async (tx) => {
      // Générer un token de vérification email
      const emailVerificationToken = randomUUID();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
      
      // Créer l'utilisateur principal
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          role: validatedData.role as UserRole,
          isActive: false, // Tous les utilisateurs sont inactifs jusqu'à vérification email
          emailVerified: null, // Email non vérifié
          validationStatus: "PENDING", // Tous en attente de vérification
          emailVerificationToken,
          emailVerificationExpires,
        },
      });

      // Créer le profil
      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone,
          address: validatedData.address,
          city: validatedData.city,
          postalCode: validatedData.postalCode,
          country: validatedData.country,
          isVerified: false, // Tous les profils doivent être vérifiés
        },
      });

      // Créer les entités spécifiques selon le rôle
      switch (validatedData.role) {
        case "CLIENT":
          await tx.client.create({
            data: {
              userId: user.id,
              subscriptionPlan: "FREE",
              termsAcceptedAt: new Date(),
            },
          });
          break;

        case "DELIVERER":
          await tx.deliverer.create({
            data: {
              userId: user.id,
              validationStatus: "PENDING",
            },
          });
          break;

        case "MERCHANT":
          await tx.merchant.create({
            data: {
              userId: user.id,
              companyName: `${validatedData.firstName} ${validatedData.lastName}`,
              siret: `SIRET_${Date.now()}`, // À remplacer par un vrai SIRET
              contractStatus: "PENDING",
            },
          });
          break;

        case "PROVIDER":
          await tx.provider.create({
            data: {
              userId: user.id,
              validationStatus: "PENDING",
              businessName: validatedData.businessName || `${validatedData.firstName} ${validatedData.lastName}`,
              specialties: validatedData.specialties || [],
              hourlyRate: validatedData.hourlyRate || 25.0,
              description: validatedData.description || "",
            },
          });
          break;

        case "ADMIN":
          await tx.admin.create({
            data: {
              userId: user.id,
              permissions: ["ALL"],
            },
          });
          break;
      }

      return { user, profile };
    });

    // Envoyer l'email de vérification
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${result.user.emailVerificationToken}`;
      await EmailService.sendVerificationEmail(
        result.user.email,
        verificationUrl,
        "fr"
      );
    } catch (emailError) {
      console.error("Erreur envoi email de vérification:", emailError);
      // Ne pas faire échouer l'inscription si l'email ne peut pas être envoyé
    }

    return NextResponse.json(
      {
        success: true,
        message: "Compte créé avec succès ! Vérifiez votre email pour activer votre compte.",
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          isActive: result.user.isActive,
          validationStatus: result.user.validationStatus,
          emailVerified: result.user.emailVerified,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
