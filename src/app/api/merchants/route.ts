import { NextResponse } from 'next/server';

// GET - Récupérer la liste des commerçants
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    
    // À implémenter: récupération des commerçants avec filtrage
    
    return NextResponse.json({ 
      message: "Endpoint de gestion des commerçants en cours de développement",
      merchants: [] 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Erreur lors de la récupération des commerçants" 
    }, { status: 500 });
  }
}

// POST - Créer un nouveau commerçant
export async function POST(request: Request) {
  try {
    const merchantData = await request.json();
    
    // À implémenter: validation et création de commerçant
    
    return NextResponse.json({ 
      message: "Création de commerçant en cours de développement" 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Erreur lors de la création du commerçant" 
    }, { status: 500 });
  }
} 