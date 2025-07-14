import { NextRequest, NextResponse } from "next/server";

// Catégories de services basées sur l'enum ServiceType du schéma Prisma
const SERVICE_CATEGORIES = [
  {
    id: "PERSON_TRANSPORT",
    name: "Transport de personnes",
    description: "Transport de personnes et accompagnement",
    icon: "car",
  },
  {
    id: "AIRPORT_TRANSFER",
    name: "Transfert aéroport",
    description: "Navette et transfert vers les aéroports",
    icon: "plane",
  },
  {
    id: "SHOPPING",
    name: "Courses",
    description: "Courses et achats à domicile",
    icon: "shopping-cart",
  },
  {
    id: "INTERNATIONAL_PURCHASE",
    name: "Achats internationaux",
    description: "Achat et import de produits internationaux",
    icon: "globe",
  },
  {
    id: "PET_CARE",
    name: "Garde d'animaux",
    description: "Garde et soins pour animaux de compagnie",
    icon: "dog",
  },
  {
    id: "HOME_SERVICE",
    name: "Services à domicile",
    description: "Ménage, jardinage et services ménagers",
    icon: "home",
  },
  {
    id: "CART_DROP",
    name: "Lâcher de chariot",
    description: "Livraison après achat en magasin",
    icon: "shopping-bag",
  },
  {
    id: "OTHER",
    name: "Autre",
    description: "Autres services personnalisés",
    icon: "clipboard",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Pour l'instant, toutes les catégories sont actives
    // On pourrait ajouter une logique pour filtrer selon la disponibilité
    let categories = SERVICE_CATEGORIES;

    if (!includeInactive) {
      // Filtrer les catégories inactives si nécessaire
      categories = SERVICE_CATEGORIES;
    }

    return NextResponse.json({
      categories,
      total: categories.length,
    });
  } catch (error) {
    console.error("Error fetching service categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
