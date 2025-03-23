"use server";

import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schémas de validation
const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(), 
  country: z.string().optional(),
  subscriptionPlan: z.enum(["FREE", "STARTER", "PREMIUM"]).default("FREE"),
});

const merchantSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  companyName: z.string().min(2),
  siret: z.string().min(14).max(14),
});

const courierSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vehicleType: z.string().min(1),
  licenseNumber: z.string().optional(),
  licensePlate: z.string().optional(),
});

const providerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  serviceTypes: z.array(z.string()).min(1),
  qualifications: z.string().optional(),
  certifications: z.string().optional(),
});

// Action serveur pour l'inscription d'un client
export async function registerClient(data: z.infer<typeof clientSchema>) {
  try {
    // Valider les données
    const validatedData = clientSchema.parse(data);

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(validatedData.password, 10);

    // Créer l'utilisateur et le client associé
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "CLIENT",
        status: "APPROVED", // Les clients sont activés immédiatement
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        client: {
          create: {
            subscriptionPlan: validatedData.subscriptionPlan,
          },
        },
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Données d'inscription invalides" };
    }
    console.error("Erreur lors de l'inscription du client:", error);
    return { success: false, error: "Une erreur est survenue lors de l'inscription" };
  }
}

// Action serveur pour l'inscription d'un commerçant
export async function registerMerchant(data: z.infer<typeof merchantSchema>) {
  try {
    // Valider les données
    const validatedData = merchantSchema.parse(data);

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }

    // Vérifier si le SIRET existe déjà
    const existingMerchant = await prisma.merchant.findUnique({
      where: { siret: validatedData.siret },
    });

    if (existingMerchant) {
      return { success: false, error: "Ce numéro SIRET est déjà utilisé" };
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(validatedData.password, 10);

    // Créer l'utilisateur et le commerçant associé
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "MERCHANT",
        status: "PENDING", // Les commerçants nécessitent une validation
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        merchant: {
          create: {
            companyName: validatedData.companyName,
            siret: validatedData.siret,
            contractType: "STANDARD",
            contractStart: new Date(),
          },
        },
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Données d'inscription invalides" };
    }
    console.error("Erreur lors de l'inscription du commerçant:", error);
    return { success: false, error: "Une erreur est survenue lors de l'inscription" };
  }
}

// Action serveur pour l'inscription d'un livreur
export async function registerCourier(data: z.infer<typeof courierSchema>) {
  try {
    // Valider les données
    const validatedData = courierSchema.parse(data);

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(validatedData.password, 10);

    // Créer l'utilisateur et le livreur associé
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "COURIER",
        status: "PENDING", // Les livreurs nécessitent une validation
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        courier: {
          create: {
            vehicleType: validatedData.vehicleType,
            licenseNumber: validatedData.licenseNumber,
            licensePlate: validatedData.licensePlate,
          },
        },
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Données d'inscription invalides" };
    }
    console.error("Erreur lors de l'inscription du livreur:", error);
    return { success: false, error: "Une erreur est survenue lors de l'inscription" };
  }
}

// Action serveur pour l'inscription d'un prestataire
export async function registerProvider(data: z.infer<typeof providerSchema>) {
  try {
    // Valider les données
    const validatedData = providerSchema.parse(data);

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(validatedData.password, 10);

    // Créer l'utilisateur et le prestataire associé
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "PROVIDER",
        status: "PENDING", // Les prestataires nécessitent une validation
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        provider: {
          create: {
            serviceTypes: validatedData.serviceTypes,
            qualifications: validatedData.qualifications,
            certifications: validatedData.certifications,
          },
        },
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Données d'inscription invalides" };
    }
    console.error("Erreur lors de l'inscription du prestataire:", error);
    return { success: false, error: "Une erreur est survenue lors de l'inscription" };
  }
}
