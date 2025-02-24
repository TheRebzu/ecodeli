import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    // Vérifiez d'abord si la table existe
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'merchant_profiles'
      );
    `

    if (!tableExists) {
      return NextResponse.json({
        merchants: [],
        message: "Service temporarily unavailable"
      })
    }

    const merchants = await prisma.merchantProfile.findMany()
    return NextResponse.json({ merchants })
  } catch (error) {
    console.error("Error fetching merchants:", error)
    return NextResponse.json(
      {
        merchants: [],
        error: "Failed to fetch merchants"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    return NextResponse.json(
      {
        message: "Merchant creation temporarily disabled",
        data
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}