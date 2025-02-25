import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const updatedCustomer = await prisma.customerProfile.update({
      where: { userId: session.user.id },
      data: {
        // Add fields that can be updated
        // For example: subscription, stripeCustomerId
      },
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error("Error updating customer data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

