// src/app/api/announcements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getCoordinatesFromAddress } from "@/lib/geocoding";

interface AnnouncementWithRelations {
  id: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoordinates: { lat: number; lng: number };
  deliveryCoordinates: { lat: number; lng: number };
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  customerId: string;
  merchantId: string | null;
  courierId: string | null;
  customer: { id: string; name: string; image: string | null; rating: number | null };
  merchant: { id: string; businessName: string; businessAddress: string; rating: number | null } | null;
  courier: { id: string; name: string; image: string | null; vehicleType: string; rating: number | null } | null;
  _count: { bids: number };
}

// Schéma de validation pour la création d'une annonce
const createAnnouncementSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  type: z.enum(["CLIENT_REQUEST", "MERCHANT_REQUEST", "COURIER_ROUTE", "SERVICE_REQUEST"]),
  packageType: z.enum([
    "SMALL_ENVELOPE", 
    "LARGE_ENVELOPE", 
    "SMALL_PACKAGE", 
    "MEDIUM_PACKAGE", 
    "LARGE_PACKAGE", 
    "EXTRA_LARGE", 
    "PALLET"
  ]).optional(),
  weight: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  length: z.number().optional(),
  isFragile: z.boolean().default(false),
  requiresRefrigeration: z.boolean().default(false),
  pickupAddress: z.string(),
  pickupCity: z.string(),
  pickupPostalCode: z.string(),
  pickupCountry: z.string().default("France"),
  deliveryAddress: z.string(),
  deliveryCity: z.string(),
  deliveryPostalCode: z.string(),
  deliveryCountry: z.string().default("France"),
  pickupDate: z.date(),
  deliveryDeadline: z.date(),
  price: z.number().optional(),
  isNegotiable: z.boolean().default(false),
  insuranceOption: z.enum(["NONE", "BASIC", "PREMIUM", "CUSTOM"]).default("NONE"),
  insuranceAmount: z.number().optional(),
  packageImages: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Récupérer les paramètres de requête
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // Max 50 par page
    const skip = (page - 1) * limit;
    
    // Filtres
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const fromCity = searchParams.get("fromCity") || undefined;
    const toCity = searchParams.get("toCity") || undefined;
    const fromDate = searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : undefined;
    const toDate = searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : undefined;
    const status = searchParams.get("status") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    
    // Pour les statuts multiples (via statusIn[])
    const statusIn = searchParams.getAll("statusIn");
    
    // Construire la requête de filtre
    const where: { [key: string]: any } = {
      deletedAt: null, // Exclure les annonces supprimées
    };
    
    // Filtre par utilisateur
    if (userId) {
      where.OR = [
        { customerId: userId },
        { merchantId: userId },
        { courierId: userId },
      ];
    }
    
    // Filtre de recherche (titre ou description)
    if (search) {
      where.OR = [
        ...where.OR || [],
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // Filtre par type d'annonce
    if (type) {
      where.type = type;
    }
    
    // Filtre par ville de départ
    if (fromCity) {
      where.pickupCity = { contains: fromCity, mode: "insensitive" };
    }
    
    // Filtre par ville d'arrivée
    if (toCity) {
      where.deliveryCity = { contains: toCity, mode: "insensitive" };
    }
    
    // Filtre par date de ramassage
    if (fromDate) {
      where.pickupDate = { gte: fromDate };
    }
    
    // Filtre par date limite de livraison
    if (toDate) {
      where.deliveryDeadline = { lte: toDate };
    }
    
    // Filtre par statut (unique)
    if (status) {
      where.status = status;
    }
    
    // Filtre par statuts multiples
    if (statusIn && statusIn.length > 0) {
      where.status = { in: statusIn };
    }
    
    // Requête pour compter le nombre total d'annonces correspondant aux filtres
    const total = await prisma.announcement.count({ where });
    
    // Requête principale pour récupérer les annonces avec pagination et tri
    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            image: true,
            rating: true,
          },
        },
        merchant: {
          select: {
            id: true,
            businessName: true,
            businessAddress: true,
            rating: true,
          },
        },
        courier: {
          select: {
            id: true,
            name: true,
            image: true,
            vehicleType: true,
            rating: true,
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
      skip,
      take: limit,
    });
    
    // Formater les résultats
    const items = announcements.map((announcement: AnnouncementWithRelations) => ({
      ...announcement,
      bids: announcement._count.bids,
      _count: undefined,
    }));
    
    // Retourner les résultats avec pagination
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des annonces:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération des annonces" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
        merchantProfile: true,
        courierProfile: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    // Vérifier le statut de l'utilisateur
    if (user.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Votre compte n'est pas encore approuvé pour publier des annonces" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    
    // Valider les données
    const validationResult = createAnnouncementSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Obtenir les coordonnées géographiques pour le point de ramassage
    let pickupCoordinates = null;
    try {
      pickupCoordinates = await getCoordinatesFromAddress(
        `${data.pickupAddress}, ${data.pickupCity}, ${data.pickupPostalCode}, ${data.pickupCountry}`
      );
    } catch (error) {
      console.error("Erreur lors de la géolocalisation du point de ramassage:", error);
    }
    
    // Obtenir les coordonnées géographiques pour le point de livraison
    let deliveryCoordinates = null;
    try {
      deliveryCoordinates = await getCoordinatesFromAddress(
        `${data.deliveryAddress}, ${data.deliveryCity}, ${data.deliveryPostalCode}, ${data.deliveryCountry}`
      );
    } catch (error) {
      console.error("Erreur lors de la géolocalisation du point de livraison:", error);
    }
    
    // Déterminer le type d'annonceur (client, commerçant ou livreur)
    let customerId = null;
    let merchantId = null;
    let courierId = null;
    
    switch (data.type) {
      case "CLIENT_REQUEST":
        if (!user.clientProfile) {
          return NextResponse.json(
            { error: "Vous devez avoir un profil client pour créer ce type d'annonce" },
            { status: 403 }
          );
        }
        customerId = userId;
        break;
        
      case "MERCHANT_REQUEST":
        if (!user.merchantProfile) {
          return NextResponse.json(
            { error: "Vous devez avoir un profil commerçant pour créer ce type d'annonce" },
            { status: 403 }
          );
        }
        merchantId = user.merchantProfile.id;
        break;
        
      case "COURIER_ROUTE":
        if (!user.courierProfile) {
          return NextResponse.json(
            { error: "Vous devez avoir un profil livreur pour créer ce type d'annonce" },
            { status: 403 }
          );
        }
        courierId = user.courierProfile.id;
        break;
        
      default:
        return NextResponse.json(
          { error: "Type d'annonce non supporté" },
          { status: 400 }
        );
    }
    
    // Créer l'annonce
    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        packageType: data.packageType,
        weight: data.weight,
        width: data.width,
        height: data.height,
        length: data.length,
        isFragile: data.isFragile,
        requiresRefrigeration: data.requiresRefrigeration,
        pickupAddress: data.pickupAddress,
        pickupCity: data.pickupCity,
        pickupPostalCode: data.pickupPostalCode,
        pickupCountry: data.pickupCountry,
        pickupCoordinates: pickupCoordinates,
        deliveryAddress: data.deliveryAddress,
        deliveryCity: data.deliveryCity,
        deliveryPostalCode: data.deliveryPostalCode,
        deliveryCountry: data.deliveryCountry,
        deliveryCoordinates: deliveryCoordinates,
        pickupDate: data.pickupDate,
        deliveryDeadline: data.deliveryDeadline,
        price: data.price,
        isNegotiable: data.isNegotiable,
        insuranceOption: data.insuranceOption,
        insuranceAmount: data.insuranceAmount,
        packageImages: data.packageImages || [],
        status: "ACTIVE", // Par défaut, l'annonce est active
        customerId,
        merchantId,
        courierId,
      },
    });
    
    return NextResponse.json(announcement, { status: 201 });
    
  } catch (error) {
    console.error("Erreur lors de la création de l'annonce:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la création de l'annonce" },
      { status: 500 }
    );
  }
}