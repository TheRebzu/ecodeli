import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { registerSchema } from "@/lib/validations/auth";

// Schema for validating registration data
const registerSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  role: z.enum(["CLIENT", "MERCHANT", "COURIER", "PROVIDER"], { 
    errorMap: () => ({ message: "Rôle invalide" })
  }),
  // Optional fields depending on role
  companyName: z.string().optional(),
  siret: z.string().optional(),
  vehicleType: z.string().optional(),
  licenseNumber: z.string().optional(),
  licensePlate: z.string().optional(),
  serviceTypes: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: "Données invalides", 
        errors: validationResult.error.errors 
      }, { status: 400 });
    }

    const { name, email, password, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: "Cet email est déjà utilisé" 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: "ACTIVE",
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      success: true, 
      message: "Utilisateur créé avec succès", 
      user: userWithoutPassword 
    }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Une erreur est survenue lors de l'inscription" 
    }, { status: 500 });
  }
} 