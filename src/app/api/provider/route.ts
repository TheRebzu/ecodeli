import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    })

    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 })
    }

    return NextResponse.json(provider)
  } catch (error) {
    console.error("Error fetching provider data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const updatedProvider = await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: {
        services: data.services,
        isVerified: data.isVerified,
        rating: data.rating,
        availability: data.availability,
      },
    })

    return NextResponse.json(updatedProvider)
  } catch (error) {
    console.error("Error updating provider data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const updatedProvider = await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: {
        services: {
          push: data.service, // Assuming data.service is a string
        },
      },
    })

    return NextResponse.json(updatedProvider, { status: 201 })
  } catch (error) {
    console.error("Error adding new service:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

