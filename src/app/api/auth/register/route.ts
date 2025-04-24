import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

// Validation schema for registration request
const registerSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  role: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
  // Optional fields depending on the role
  // These will be validated in the handler based on the role
  storeName: z.string().optional(),
  storeType: z.string().optional(),
  siret: z.string().optional(),
  vehicleType: z.string().optional(),
  licenseNumber: z.string().optional(),
  idCardNumber: z.string().optional(),
  serviceType: z.string().optional(),
  experience: z.string().optional(),
  hourlyRate: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  serviceArea: z.number().optional(),
  availability: z.array(z.string()).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    const { email, password, firstName, lastName, role, ...roleSpecificData } = validatedData;
    const name = `${firstName} ${lastName}`;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cette adresse email existe déjà" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user based on role
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
      },
    });

    // Create role-specific profile
    if (role === "MERCHANT" && roleSpecificData.storeName && roleSpecificData.storeType) {
      await prisma.store.create({
        data: {
          name: roleSpecificData.storeName,
          type: roleSpecificData.storeType,
          description: "Description par défaut du commerce",
          siret: roleSpecificData.siret,
          address: roleSpecificData.address || "",
          city: roleSpecificData.city || "",
          postalCode: roleSpecificData.postalCode || "",
          phoneNumber: roleSpecificData.phone || "",
          merchantId: user.id,
        },
      });
    } else if (role === "DELIVERER" && roleSpecificData.vehicleType) {
      await prisma.delivererProfile.create({
        data: {
          userId: user.id,
          vehicleType: roleSpecificData.vehicleType || "",
          licenseNumber: roleSpecificData.licenseNumber || "",
          idCardNumber: roleSpecificData.idCardNumber || "",
          address: roleSpecificData.address || "",
          city: roleSpecificData.city || "",
          postalCode: roleSpecificData.postalCode || "",
          availability: roleSpecificData.availability || [],
          isVerified: false,
        },
      });
    } else if (role === "PROVIDER" && roleSpecificData.serviceType) {
      await prisma.serviceProvider.create({
        data: {
          userId: user.id,
          serviceType: roleSpecificData.serviceType || "",
          experience: roleSpecificData.experience,
          hourlyRate: roleSpecificData.hourlyRate,
          address: roleSpecificData.address || "",
          city: roleSpecificData.city || "",
          postalCode: roleSpecificData.postalCode || "",
          serviceArea: roleSpecificData.serviceArea,
          description: roleSpecificData.description,
          siret: roleSpecificData.siret,
          isVerified: false,
        },
      });
    } else if (role === "CLIENT") {
      // Client profile with optional phone
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          phone: roleSpecificData.phone,
        },
      });
    }

    // Generate and store verification token
    const verificationToken = await generateVerificationToken(user.id);

    // Send verification email
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