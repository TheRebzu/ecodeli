import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MerchantSettingsSchema = z.object({
  businessName: z.string().min(1, "Le nom du commerce est requis"),
  businessType: z.string(),
  siret: z.string().optional(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string(),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string(),

  // Paramètres de livraison
  deliveryEnabled: z.boolean(),
  deliveryZones: z.array(z.string()),
  deliveryHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  minOrderAmount: z.number().min(0),
  deliveryFee: z.number().min(0),

  // Notifications
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  orderNotifications: z.boolean(),
  deliveryNotifications: z.boolean(),
  marketingNotifications: z.boolean(),

  // Paramètres de paiement
  paymentMethods: z.array(z.string()),
  autoWithdraw: z.boolean(),
  withdrawalDay: z.number().min(1).max(28),
  taxRate: z.number().min(0).max(100),

  // Paramètres d'affichage
  displayMode: z.enum(["public", "private"]),
  showRatings: z.boolean(),
  showInventory: z.boolean(),
  showPrices: z.boolean(),

  // Intégrations
  posIntegration: z.boolean(),
  inventorySync: z.boolean(),
  accountingSync: z.boolean(),
});

// GET - Récupérer les paramètres merchant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Récupérer les paramètres merchant
    const merchantProfile = await prisma.merchantProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        merchantSettings: true,
      },
    });

    if (!merchantProfile) {
      return NextResponse.json(
        { error: "Profil merchant non trouvé" },
        { status: 404 },
      );
    }

    // Fusionner les données du profil et des paramètres
    const settings = {
      // Données du profil
      businessName: merchantProfile.businessName || "",
      businessType: merchantProfile.businessType || "",
      siret: merchantProfile.siret || "",
      address: merchantProfile.address || "",
      city: merchantProfile.city || "",
      postalCode: merchantProfile.postalCode || "",
      country: merchantProfile.country || "France",
      phone: merchantProfile.phone || "",
      email: merchantProfile.email || "",
      website: merchantProfile.website || "",
      description: merchantProfile.description || "",

      // Paramètres par défaut si pas encore configurés
      deliveryEnabled:
        merchantProfile.merchantSettings?.deliveryEnabled ?? true,
      deliveryZones: merchantProfile.merchantSettings?.deliveryZones ?? [],
      deliveryHours: merchantProfile.merchantSettings?.deliveryHours ?? {
        start: "09:00",
        end: "18:00",
      },
      minOrderAmount: merchantProfile.merchantSettings?.minOrderAmount ?? 0,
      deliveryFee: merchantProfile.merchantSettings?.deliveryFee ?? 5.0,

      emailNotifications:
        merchantProfile.merchantSettings?.emailNotifications ?? true,
      smsNotifications:
        merchantProfile.merchantSettings?.smsNotifications ?? false,
      pushNotifications:
        merchantProfile.merchantSettings?.pushNotifications ?? true,
      orderNotifications:
        merchantProfile.merchantSettings?.orderNotifications ?? true,
      deliveryNotifications:
        merchantProfile.merchantSettings?.deliveryNotifications ?? true,
      marketingNotifications:
        merchantProfile.merchantSettings?.marketingNotifications ?? false,

      paymentMethods: merchantProfile.merchantSettings?.paymentMethods ?? [
        "stripe",
      ],
      autoWithdraw: merchantProfile.merchantSettings?.autoWithdraw ?? false,
      withdrawalDay: merchantProfile.merchantSettings?.withdrawalDay ?? 15,
      taxRate: merchantProfile.merchantSettings?.taxRate ?? 20,

      displayMode: merchantProfile.merchantSettings?.displayMode ?? "public",
      showRatings: merchantProfile.merchantSettings?.showRatings ?? true,
      showInventory: merchantProfile.merchantSettings?.showInventory ?? true,
      showPrices: merchantProfile.merchantSettings?.showPrices ?? true,

      posIntegration: merchantProfile.merchantSettings?.posIntegration ?? false,
      inventorySync: merchantProfile.merchantSettings?.inventorySync ?? false,
      accountingSync: merchantProfile.merchantSettings?.accountingSync ?? false,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// PUT - Mettre à jour les paramètres merchant
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = MerchantSettingsSchema.parse(body);

    // Vérifier que le profil merchant existe
    let merchantProfile = await prisma.merchantProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!merchantProfile) {
      // Créer le profil merchant s'il n'existe pas
      merchantProfile = await prisma.merchantProfile.create({
        data: {
          userId: session.user.id,
          businessName: validatedData.businessName,
          businessType: validatedData.businessType,
          siret: validatedData.siret,
          address: validatedData.address,
          city: validatedData.city,
          postalCode: validatedData.postalCode,
          country: validatedData.country,
          phone: validatedData.phone,
          email: validatedData.email,
          website: validatedData.website,
          description: validatedData.description,
          status: "ACTIVE",
          verificationStatus: "PENDING",
        },
      });
    } else {
      // Mettre à jour le profil merchant existant
      merchantProfile = await prisma.merchantProfile.update({
        where: { userId: session.user.id },
        data: {
          businessName: validatedData.businessName,
          businessType: validatedData.businessType,
          siret: validatedData.siret,
          address: validatedData.address,
          city: validatedData.city,
          postalCode: validatedData.postalCode,
          country: validatedData.country,
          phone: validatedData.phone,
          email: validatedData.email,
          website: validatedData.website,
          description: validatedData.description,
        },
      });
    }

    // Mettre à jour ou créer les paramètres merchant
    const settingsData = {
      deliveryEnabled: validatedData.deliveryEnabled,
      deliveryZones: validatedData.deliveryZones,
      deliveryHours: validatedData.deliveryHours,
      minOrderAmount: validatedData.minOrderAmount,
      deliveryFee: validatedData.deliveryFee,

      emailNotifications: validatedData.emailNotifications,
      smsNotifications: validatedData.smsNotifications,
      pushNotifications: validatedData.pushNotifications,
      orderNotifications: validatedData.orderNotifications,
      deliveryNotifications: validatedData.deliveryNotifications,
      marketingNotifications: validatedData.marketingNotifications,

      paymentMethods: validatedData.paymentMethods,
      autoWithdraw: validatedData.autoWithdraw,
      withdrawalDay: validatedData.withdrawalDay,
      taxRate: validatedData.taxRate,

      displayMode: validatedData.displayMode,
      showRatings: validatedData.showRatings,
      showInventory: validatedData.showInventory,
      showPrices: validatedData.showPrices,

      posIntegration: validatedData.posIntegration,
      inventorySync: validatedData.inventorySync,
      accountingSync: validatedData.accountingSync,
    };

    await prisma.merchantSettings.upsert({
      where: { merchantProfileId: merchantProfile.id },
      update: settingsData,
      create: {
        merchantProfileId: merchantProfile.id,
        ...settingsData,
      },
    });

    // Créer une notification pour l'admin si des intégrations sont activées
    if (
      validatedData.posIntegration ||
      validatedData.inventorySync ||
      validatedData.accountingSync
    ) {
      await prisma.notification.create({
        data: {
          type: "MERCHANT_INTEGRATION_REQUEST",
          title: "Demande d'intégration merchant",
          message: `Le merchant ${validatedData.businessName} a activé des intégrations`,
          data: {
            merchantId: merchantProfile.id,
            integrations: {
              pos: validatedData.posIntegration,
              inventory: validatedData.inventorySync,
              accounting: validatedData.accountingSync,
            },
          },
          priority: "MEDIUM",
        },
      });
    }

    return NextResponse.json({
      message: "Paramètres sauvegardés avec succès",
      data: validatedData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Erreur lors de la sauvegarde des paramètres:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
