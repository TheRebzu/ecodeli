import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Implémentation export-excel
  return NextResponse.json({ status: 'ok', type: 'export-excel' });
}

export async function POST(request: NextRequest) {
  // Implémentation export-excel
  return NextResponse.json({ status: 'ok', type: 'export-excel' });
}
