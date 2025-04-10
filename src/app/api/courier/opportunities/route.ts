// src/app/api/courier/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { calculateDistance, findNearbyAnnouncements } from "@/lib/geocoding";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Vérifier si l'utilisateur a un profil de livreur
    const courier = await prisma.deliveryPerson.findFirst({
      where: { userId },
    });
    
    if (!courier) {
      return NextResponse.json(
        { error: "Vous devez être inscrit en tant que livreur pour accéder à cette fonctionnalité" },
        { status: 403 }
      );
    }
    
    // Récupérer les paramètres de requête
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // Max 50 par page
    const skip = (page - 1) * limit;
    
    // Filtres
    const search = searchParams.get("search") || undefined;
    const packageType = searchParams.get("packageType") || undefined;
    const fromCity = searchParams.get("fromCity") || undefined;
    const toCity = searchParams.get("toCity") || undefined;
    const fromDate = searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : undefined;
    const toDate = searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : undefined;
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const weightRange = searchParams.get("weightRange") || undefined;
    const status = searchParams.get("status") || "ACTIVE";
    const isNearbyOnly = searchParams.get("isNearbyOnly") === "true";
    
    // Paramètres de localisation
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;
    const maxDistance = searchParams.get("maxDistance") ? parseFloat(searchParams.get("maxDistance")!) : 50;
    
    // Paramètres de tri
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    
    // Construire la requête de filtre
    const where: any = {
      status,
      deletedAt: null, // Exclure les annonces supprimées
      type: { in: ["CLIENT_REQUEST", "MERCHANT_REQUEST"] }, // Seulement les demandes clients et commerçants
    };
    
    // Exclure les annonces où l'utilisateur a déjà fait une offre
    const userBids = await prisma.bid.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      select: {
        announcementId: true,
      },
    });
    
    const userBidAnnouncementIds = userBids.map(bid => bid.announcementId);
    
    // Filtre de recherche (titre ou description)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // Filtre par type de colis
    if (packageType) {
      where.packageType = packageType;
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
    
    // Filtre par prix
    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: minPrice };
    }
    
    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice };
    }
    
    // Filtre par poids
    if (weightRange) {
      const [min, max] = weightRange.split("-");
      if (min && max) {
        where.weight = { gte: parseFloat(min), lte: parseFloat(max) };
      } else if (min && min.endsWith("+")) {
        where.weight = { gte: parseFloat(min) };
      }
    }
    
    // Déterminer s'il faut faire un filtrage par localisation
    const useLocationFiltering = isNearbyOnly && lat !== undefined && lng !== undefined;
    
    let total = 0;
    let announcements: any[] = [];
    
    // Si le filtrage par localisation est activé, nous traitons la logique différemment
    if (useLocationFiltering) {
      // Récupérer toutes les annonces correspondant aux critères
      const allAnnouncements = await prisma.announcement.findMany({
        where,
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
              rating: true,
            },
          },
          _count: {
            select: {
              bids: true,
            },
          },
        },
      });
      
      // Filtrer les annonces par distance
      const nearbyAnnouncements = findNearbyAnnouncements(
        allAnnouncements,
        lat!,
        lng!,
        maxDistance
      );
      
      total = nearbyAnnouncements.length;
      
      // Appliquer la pagination manuellement
      announcements = nearbyAnnouncements.slice(skip, skip + limit);
    } else {
      // Requête normale sans filtrage par localisation
      total = await prisma.announcement.count({ where });
      
      // Tri par défaut
      const orderBy: any = {
        [sortBy]: sortOrder,
      };
      
      announcements = await prisma.announcement.findMany({
        where,
        orderBy,
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
    }
    
    // Marquer les annonces pour lesquelles l'utilisateur a déjà fait une offre
    const items = announcements.map((announcement) => ({
      ...announcement,
      bids: announcement._count.bids,
      _count: undefined,
      hasUserBid: userBidAnnouncementIds.includes(announcement.id),
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
    console.error("Erreur lors de la récupération des opportunités:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération des opportunités" },
      { status: 500 }
    );
  }
}