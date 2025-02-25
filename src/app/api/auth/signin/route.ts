import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new NextResponse("Missing email or password", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        customerProfile: true,
        courierProfile: true,
        merchantProfile: true,
        providerProfile: true,
      },
    })

    if (!user) {
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    const profileMap = {
      CUSTOMER: user.customerProfile,
      COURIER: user.courierProfile,
      MERCHANT: user.merchantProfile,
      PROVIDER: user.providerProfile,
      ADMIN: null, // Admins don't have a specific profile
    }

    const profile = user.role === "ADMIN" ? null : profileMap[user.role as keyof typeof profileMap]

    // Générer le JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profileId: profile?.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" },
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[SIGNIN_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

