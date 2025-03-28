import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params.id;

    // Check if the session exists and belongs to the user
    const sessionToDelete = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!sessionToDelete) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (sessionToDelete.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this session" },
        { status: 403 }
      );
    }

    // Check if trying to delete current session
    const currentSessionToken = session.user.sessionToken;
    if (sessionToDelete.sessionToken === currentSessionToken) {
      return NextResponse.json(
        { error: "Cannot disconnect current device. Please log out instead." },
        { status: 400 }
      );
    }

    // Delete the session (disconnect the device)
    await prisma.session.delete({
      where: { id: sessionId },
    });

    // Create audit log for the session deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DEVICE_DISCONNECT",
        entityType: "SESSION",
        entityId: sessionId,
        details: "User disconnected a device",
      },
    });

    return NextResponse.json({
      message: "Device disconnected successfully",
    });
  } catch (error: unknown) {
    console.error("Error disconnecting device:", error);
    return NextResponse.json(
      { error: "Failed to disconnect device" },
      { status: 500 }
    );
  }
} 