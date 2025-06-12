import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Locales supportées selon la configuration i18n
const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de', 'it'];
const DEFAULT_LOCALE = 'fr';

/**
 * Endpoint GET pour récupérer les messages de traduction
 * Query params:
 * - locale: la locale demandée (fr, en, es, de, it)
 * 
 * Retourne le fichier JSON de messages correspondant à la locale
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || DEFAULT_LOCALE;

    // Vérifier que la locale est supportée
    if (!SUPPORTED_LOCALES.includes(locale)) {
      return NextResponse.json(
        { error: `Locale '${locale}' non supportée. Locales disponibles: ${SUPPORTED_LOCALES.join(', ')}` },
        { status: 400 }
      );
    }

    // Chemin vers le fichier de messages
    const messagesPath = path.join(process.cwd(), 'src', 'messages', `${locale}.json`);

    // Vérifier que le fichier existe
    if (!fs.existsSync(messagesPath)) {
      return NextResponse.json(
        { error: `Fichier de messages non trouvé pour la locale '${locale}'` },
        { status: 404 }
      );
    }

    // Lire et parser le fichier JSON
    const messagesContent = fs.readFileSync(messagesPath, 'utf-8');
    const messages = JSON.parse(messagesContent);

    // Retourner les messages avec les en-têtes appropriés
    return NextResponse.json(messages, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache pendant 1 heure
      },
    });

  } catch (error) {
    console.error('Erreur lors du chargement des messages i18n:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors du chargement des messages' },
      { status: 500 }
    );
  }
} 