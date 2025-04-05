import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // À implémenter: logique d'authentification
    
    return NextResponse.json({ 
      message: "Endpoint d'authentification en cours de développement" 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Erreur de traitement de la requête" 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Endpoint d'authentification en cours de développement" 
  }, { status: 200 });
} 