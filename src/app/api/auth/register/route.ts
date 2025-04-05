<<<<<<< Updated upstream
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { Status } from "@prisma/client";

export async function POST(req: Request) {
=======
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { registerSchema } from "@/lib/validations/auth.schema";
import { UserRole, UserStatus } from "@prisma/client";

// Schéma de validation simplifié côté serveur
const simpleRegisterSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
  role: z.enum(["CLIENT", "LIVREUR", "COMMERCANT", "PRESTATAIRE"], {
    required_error: "Veuillez sélectionner un rôle",
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions générales d'utilisation",
  }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Fonction pour convertir le rôle du frontend au format attendu par Prisma
function convertRoleToPrismaEnum(role: string) {
  // Mapper entre les rôles définis dans Zod et les rôles attendus par Prisma
  const roleMapping = {
    "CLIENT": "CUSTOMER",
    "LIVREUR": "DELIVERY_PERSON",
    "COMMERCANT": "MERCHANT",
    "PRESTATAIRE": "SERVICE_PROVIDER",
  };
  
  // @ts-expect-error - On ignore l'erreur TypeScript car on sait que la clé existe
  const prismaRole = roleMapping[role];
  
  if (!prismaRole) {
    throw new Error(`Rôle non valide: ${role}`);
  }
  
  return prismaRole;
}

// Ajout d'une fonction OPTIONS pour gérer les requêtes CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: NextRequest) {
>>>>>>> Stashed changes
  try {
    // Parse request body
    const body = await req.json();
    const { name, email, password, role } = body;

<<<<<<< Updated upstream
    // Validations de base
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db.user.findUnique({
      where: { email }
=======
    // Validate input using Zod schema
    const validatedData = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
>>>>>>> Stashed changes
    });

    if (existingUser) {
      return NextResponse.json(
<<<<<<< Updated upstream
        { message: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Vérification du rôle
    const validRoles = ["CLIENT", "COURIER", "MERCHANT", "PROVIDER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Rôle utilisateur invalide" },
        { status: 400 }
      );
    }

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur
    const user = await db.user.create({
=======
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
>>>>>>> Stashed changes
      data: {
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        password: hashedPassword,
<<<<<<< Updated upstream
        role,
        status: Status.APPROVED,
      }
    });

    // Retourner l'utilisateur sans le mot de passe
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json(
      { 
        message: "Inscription réussie", 
        user: userWithoutPassword 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    return NextResponse.json(
      { message: "Une erreur est survenue lors de l'inscription" },
=======
        phone: validatedData.phone,
        role: validatedData.role,
        // Handle role-specific fields in a transaction if needed
        // This is a simplified version
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        user: userWithoutPassword,
        message: "Inscription réussie"
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
      { error: "Une erreur s'est produite lors de l'inscription" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
} 