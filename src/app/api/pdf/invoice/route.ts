import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Implémentation pdf-invoice
  return NextResponse.json({ status: 'ok', type: 'pdf-invoice' });
}

export async function POST(request: NextRequest) {
  // Implémentation pdf-invoice
  return NextResponse.json({ status: 'ok', type: 'pdf-invoice' });
}
