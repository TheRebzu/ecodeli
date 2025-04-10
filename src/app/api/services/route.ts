import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Logique pour récupérer des données
    return NextResponse.json({ message: 'Données récupérées avec succès' });
  } catch (error) {
    console.error('Erreur GET:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des données' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Logique pour créer des données
    return NextResponse.json({ message: 'Données créées avec succès', data });
  } catch (error) {
    console.error('Erreur POST:', error);
    return NextResponse.json({ error: 'Erreur lors de la création des données' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    // Logique pour mettre à jour des données
    return NextResponse.json({ message: 'Données mises à jour avec succès', data });
  } catch (error) {
    console.error('Erreur PUT:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour des données' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Logique pour supprimer des données
    return NextResponse.json({ message: 'Données supprimées avec succès' });
  } catch (error) {
    console.error('Erreur DELETE:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression des données' }, { status: 500 });
  }
}
