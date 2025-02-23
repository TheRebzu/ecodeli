import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const merchants = await prisma.merchantProfile.findMany({
      include: {
        user: true,
      },
    })

    return NextResponse.json({ merchants })
  } catch (error) {
    console.error("Error fetching merchants:", error)
    return NextResponse.json({ error: "Error fetching merchants" }, { status: 500 })
  }
}

