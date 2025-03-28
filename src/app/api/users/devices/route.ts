import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's active sessions (connected devices)
    const sessions = await prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { expires: "desc" },
    });

    // Extract device information from user agent if available
    const devices = sessions.map(session => {
      // In a real app, you would parse user agent to extract device info
      // For this example, we'll create a simple representation
      const isCurrentSession = session.sessionToken === session.sessionToken; // Placeholder - in real app, compare with actual current token
      
      return {
        id: session.id,
        lastActive: session.expires,
        isCurrentDevice: isCurrentSession,
        device: "Unknown Device", // In real app, extract from user agent
        browser: "Unknown Browser", // In real app, extract from user agent
        location: "Unknown Location", // In real app, determine from IP
      };
    });

    return NextResponse.json({ data: devices });
  } catch (error: unknown) {
    console.error("Error fetching connected devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch connected devices" },
      { status: 500 }
    );
  }
} 