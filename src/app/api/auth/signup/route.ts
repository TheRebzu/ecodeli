import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import * as z from "zod";

// Schéma de validation pour l'inscription
const signUpSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phoneNumber: z.string().min(10, "Numéro de téléphone invalide"),
  role: z.enum(["CUSTOMER", "COURIER", "MERCHANT", "PROVIDER"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validation des données
    const validatedData = signUpSchema.parse(body);

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(validatedData.password, 12);

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
          status: "PENDING", // L'utilisateur doit être activé via email
        },
      });

      // Créer le profil spécifique selon le rôle
      switch (validatedData.role) {
        case "CUSTOMER":
          await tx.customerProfile.create({
            data: {
              userId: newUser.id,
              subscription: "FREE"
            },
          });
          break;
        case "COURIER":
          await tx.courierProfile.create({
            data: {
              userId: newUser.id,
              isVerified: false,
              documentsSubmitted: false,
            },
          });
          break;
        case "MERCHANT":
          await tx.merchantProfile.create({
            data: {
              userId: newUser.id,
              companyName: "", // À compléter ultérieurement
              siret: "", // À compléter ultérieurement
              businessType: "", // À compléter ultérieurement
              isVerified: false,
            },
          });
          break;
        case "PROVIDER":
          await tx.providerProfile.create({
            data: {
              userId: newUser.id,
              services: [],
              isVerified: false,
            },
          });
          break;
      }

      return newUser;
    });

    // Créer un token de vérification
    const verificationToken = await prisma.verificationToken.create({
      data: {
        token: Math.random().toString(36).substr(2, 8),
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
      },
    });

    // TODO: Envoyer l'email de vérification avec le token
    // Exemple: await sendVerificationEmail(user.email, verificationToken.token);

    // Retourner la réponse sans données sensibles
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        message: "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur d'inscription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Données invalides",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}