// src/app/api/directions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCoordinatesFromAddress, calculateDistance } from "@/lib/geocoding";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const body = await req.json();
    const { origin, destination } = body;
    
    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Les adresses d'origine et de destination sont requises" },
        { status: 400 }
      );
    }
    
    // Obtenir les coordonnées géographiques pour l'origine
    const originCoordinates = await getCoordinatesFromAddress(origin);
    
    if (!originCoordinates) {
      return NextResponse.json(
        { error: "Impossible de géocoder l'adresse d'origine" },
        { status: 400 }
      );
    }
    
    // Obtenir les coordonnées géographiques pour la destination
    const destinationCoordinates = await getCoordinatesFromAddress(destination);
    
    if (!destinationCoordinates) {
      return NextResponse.json(
        { error: "Impossible de géocoder l'adresse de destination" },
        { status: 400 }
      );
    }
    
    // Calculer la distance à vol d'oiseau
    const directDistance = calculateDistance(
      originCoordinates.lat,
      originCoordinates.lng,
      destinationCoordinates.lat,
      destinationCoordinates.lng
    );
    
    // Pour des itinéraires plus réalistes, nous utiliserions un service comme
    // l'API Directions de Google Maps ou OSRM. Pour cet exemple, nous allons
    // simuler un itinéraire simple avec quelques points intermédiaires.
    
    // Générer un itinéraire simplifié
    const route = generateSimplifiedRoute(originCoordinates, destinationCoordinates);
    
    // Pour simuler un trajet routier, nous appliquons un facteur à la distance à vol d'oiseau
    const estimatedDistance = directDistance * 1.3;
    
    return NextResponse.json({
      origin: originCoordinates,
      destination: destinationCoordinates,
      distance: estimatedDistance,
      route,
    });
    
  } catch (error) {
    console.error("Erreur lors du calcul de l'itinéraire:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors du calcul de l'itinéraire" },
      { status: 500 }
    );
  }
}

/**
 * Génère un itinéraire simplifié avec quelques points intermédiaires
 * entre l'origine et la destination.
 * 
 * @param origin Coordonnées d'origine {lat, lng}
 * @param destination Coordonnées de destination {lat, lng}
 * @returns Liste des coordonnées représentant l'itinéraire
 */
function generateSimplifiedRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Array<{ lat: number; lng: number }> {
  const route = [origin];
  
  // Ajouter quelques points intermédiaires
  const numPoints = 5;
  
  for (let i = 1; i <= numPoints; i++) {
    const ratio = i / (numPoints + 1);
    
    // Interpolation linéaire + petit déplacement aléatoire
    const lat = origin.lat + (destination.lat - origin.lat) * ratio + (Math.random() - 0.5) * 0.01;
    const lng = origin.lng + (destination.lng - origin.lng) * ratio + (Math.random() - 0.5) * 0.01;
    
    route.push({ lat, lng });
  }
  
  route.push(destination);
  
  return route;
}