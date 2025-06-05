import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Implémentation pdf-contract
  return NextResponse.json({ status: 'ok', type: 'pdf-contract' });
}

export async function POST(request: NextRequest) {
  // Implémentation pdf-contract
  return NextResponse.json({ status: 'ok', type: 'pdf-contract' });
}
