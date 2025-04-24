import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { validatePassword } from "@/lib/auth/password";

// Schéma de validation commun pour tous les types d'inscription
const baseRegistrationSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

// Schéma spécifique pour l'inscription des clients
const clientRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("CLIENT"),
});

// Schéma spécifique pour l'inscription des livreurs
const delivererRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("DELIVERER"),
  vehicleType: z.string().min(1, "Le type de véhicule est requis"),
  licenseNumber: z.string().optional(),
  idCardNumber: z.string().optional(),
  availability: z.array(z.string()).optional(),
});

// Schéma spécifique pour l'inscription des commerçants
const merchantRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("MERCHANT"),
  storeName: z.string().min(2, "Le nom du commerce doit contenir au moins 2 caractères"),
  storeType: z.string().min(1, "Le type de commerce est requis"),
  siret: z.string().min(14, "Le numéro SIRET doit contenir 14 caractères").max(14),
});

// Schéma spécifique pour l'inscription des prestataires
const providerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("PROVIDER"),
  serviceType: z.string().min(1, "Le type de service est requis"),
  experience: z.string().optional(),
  hourlyRate: z.string().optional(),
  serviceArea: z.number().optional(),
  description: z.string().optional(),
  siret: z.string().optional(),
});

// Union des schémas pour valider tous les types d'inscription
const registrationSchema = z.discriminatedUnion("role", [
  clientRegistrationSchema,
  delivererRegistrationSchema,
  merchantRegistrationSchema,
  providerRegistrationSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation du mot de passe avant la validation du schéma complet
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }
    
    // Validation des données selon le schéma
    const validatedData = registrationSchema.parse(body);

    const { email, password, firstName, lastName, role, ...roleSpecificData } = validatedData;
    const name = `${firstName} ${lastName}`;

    // Vérification si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cette adresse email existe déjà" },
        { status: 409 }
      );
    }

    // Hachage du mot de passe
    const hashedPassword = await hashPassword(password);

    // Création de l'utilisateur
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
      },
    });

    // Création du profil spécifique au rôle
    switch (role) {
      case "CLIENT":
        await prisma.clientProfile.create({
          data: {
            userId: user.id,
            phone: roleSpecificData.phone,
            address: roleSpecificData.address,
            city: roleSpecificData.city,
            postalCode: roleSpecificData.postalCode,
          },
        });
        break;
        
      case "DELIVERER":
        const delivererData = roleSpecificData as z.infer<typeof delivererRegistrationSchema>;
        await prisma.delivererProfile.create({
          data: {
            userId: user.id,
            vehicleType: delivererData.vehicleType,
            licenseNumber: delivererData.licenseNumber,
            idCardNumber: delivererData.idCardNumber,
            address: delivererData.address || "",
            city: delivererData.city || "",
            postalCode: delivererData.postalCode || "",
            availability: delivererData.availability || [],
            isVerified: false,
          },
        });
        break;
        
      case "MERCHANT":
        const merchantData = roleSpecificData as z.infer<typeof merchantRegistrationSchema>;
        await prisma.store.create({
          data: {
            name: merchantData.storeName,
            type: merchantData.storeType,
            description: "Description par défaut du commerce",
            siret: merchantData.siret,
            address: merchantData.address || "",
            city: merchantData.city || "",
            postalCode: merchantData.postalCode || "",
            phoneNumber: merchantData.phone || "",
            merchantId: user.id,
          },
        });
        break;
        
      case "PROVIDER":
        const providerData = roleSpecificData as z.infer<typeof providerRegistrationSchema>;
        await prisma.serviceProvider.create({
          data: {
            userId: user.id,
            serviceType: providerData.serviceType,
            experience: providerData.experience,
            hourlyRate: providerData.hourlyRate,
            address: providerData.address || "",
            city: providerData.city || "",
            postalCode: providerData.postalCode || "",
            serviceArea: providerData.serviceArea,
            description: providerData.description,
            siret: providerData.siret,
            isVerified: false,
          },
        });
        break;
    }

    // Génération et stockage du token de vérification
    const verificationToken = await generateVerificationToken(user.id);

    // Envoi de l'email de vérification
    await sendVerificationEmail(
      user.email,
      user.name || "Utilisateur",
      verificationToken
    );

    return NextResponse.json(
      { 
        success: true, 
        message: "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    );
  }
}
