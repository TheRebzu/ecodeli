// Route API pour vérifier la santé de l'application
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Vérifier la connexion à la base de données
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        database: "connected",
        auth: "operational"
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed"
      },
      { status: 503 }
    )
  }
}