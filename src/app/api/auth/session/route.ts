import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-simple"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { user: null, session: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      user,
      session: {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

  } catch (error) {
    console.error("Erreur session API:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
} 