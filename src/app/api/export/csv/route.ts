import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Implémentation export-csv
  return NextResponse.json({ status: 'ok', type: 'export-csv' });
}

export async function POST(request: NextRequest) {
  // Implémentation export-csv
  return NextResponse.json({ status: 'ok', type: 'export-csv' });
}
