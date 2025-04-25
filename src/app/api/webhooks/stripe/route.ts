// Contournement temporaire pour le build
// À ne pas utiliser en production

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Version simplifée pour le build uniquement
  return NextResponse.json({ success: true });
}
