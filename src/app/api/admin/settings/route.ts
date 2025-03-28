import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating settings update
const settingsUpdateSchema = z.object({
  deliveryPricePerKm: z.number().min(0).optional(),
  minDeliveryPrice: z.number().min(0).optional(),
  maxPackageWeight: z.number().min(0).optional(),
  platformFeePercentage: z.number().min(0).max(100).optional(),
  currencyCode: z.string().length(3).optional(),
  customerSupportEmail: z.string().email().optional(),
  customerSupportPhone: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  enableNewUserRegistration: z.boolean().optional(),
  allowPaymentsWithoutVerification: z.boolean().optional(),
  autoApproveStandardUsers: z.boolean().optional(),
  termsOfServiceUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
  allowedPaymentMethods: z.array(z.string()).optional(),
  defaultLanguage: z.string().optional(),
  systemNotices: z.string().optional(),
});

// GET: Retrieve current system settings
export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    // Retrieve all settings
    const settings = await prisma.settings.findFirst({
      where: { active: true }
    });
    
    if (!settings) {
      return NextResponse.json(
        { error: "Paramètres non trouvés" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: settings });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    );
  }
}

// PATCH: Update system settings
export async function PATCH(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = settingsUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { data: settingsData } = validationResult;
    
    // Find current active settings
    const currentSettings = await prisma.settings.findFirst({
      where: { active: true }
    });
    
    let updatedSettings;
    
    if (currentSettings) {
      // Update existing settings
      updatedSettings = await prisma.settings.update({
        where: { id: currentSettings.id },
        data: settingsData
      });
    } else {
      // Create new settings if none exist
      updatedSettings = await prisma.settings.create({
        data: {
          ...settingsData,
          active: true
        }
      });
    }
    
    // Log the settings change
    await prisma.activityLog.create({
      data: {
        action: "SETTINGS_UPDATE",
        description: "Paramètres système mis à jour",
        performedBy: session.user.email,
        details: JSON.stringify(settingsData)
      }
    });
    
    return NextResponse.json({
      message: "Paramètres mis à jour avec succès",
      data: updatedSettings
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour des paramètres:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres" },
      { status: 500 }
    );
  }
} 