import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const json = await request.json()

    const delivery = await prisma.delivery.create({
      data: json,
    })

    return new NextResponse(JSON.stringify(delivery), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error(error)
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function GET() {
  try {
    const deliveries = await prisma.delivery.findMany()

    return new NextResponse(JSON.stringify(deliveries), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error(error)
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

