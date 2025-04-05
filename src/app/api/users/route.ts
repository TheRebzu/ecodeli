import { NextResponse } from 'next/server';

// GET - Récupérer la liste des utilisateurs
export async function GET() {
  try {
    // À implémenter: récupération des utilisateurs depuis la base de données
    
    return NextResponse.json({ 
      message: "Endpoint de gestion des utilisateurs en cours de développement",
      users: [] 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Erreur lors de la récupération des utilisateurs" 
    }, { status: 500 });
  }
}

// POST - Créer un nouvel utilisateur
export async function POST(request: Request) {
  try {
    const userData = await request.json();
    
    // À implémenter: validation et création d'utilisateur
    
    return NextResponse.json({ 
      message: "Création d'utilisateur en cours de développement" 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Erreur lors de la création de l'utilisateur" 
    }, { status: 500 });
  }
} 