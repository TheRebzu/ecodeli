import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST: Mark interest in an announcement
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const announcementId = params.id;
    
    // Check if announcement exists and is active
    const announcement = await prisma.announcement.findUnique({
      where: { 
        id: announcementId,
        status: "ACTIVE"
      }
    });
    
    if (!announcement) {
      return NextResponse.json({ error: "Annonce non trouvée ou inactive" }, { status: 404 });
    }
    
    // Check if user already expressed interest
    const existingInterest = await prisma.interest.findFirst({
      where: {
        announcementId,
        userId: session.user.id
      }
    });
    
    if (existingInterest) {
      return NextResponse.json({ 
        message: "Vous avez déjà exprimé votre intérêt pour cette annonce",
        isInterested: true 
      });
    }
    
    // Create new interest
    await prisma.interest.create({
      data: {
        announcement: { connect: { id: announcementId } },
        user: { connect: { id: session.user.id } }
      }
    });
    
    return NextResponse.json({
      message: "Intérêt marqué avec succès",
      isInterested: true
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors du marquage d'intérêt:", error);
    return NextResponse.json(
      { error: "Erreur lors du marquage d'intérêt" },
      { status: 500 }
    );
  }
}

// DELETE: Remove interest from an announcement
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const announcementId = params.id;
    
    // Find the interest record
    const interest = await prisma.interest.findFirst({
      where: {
        announcementId,
        userId: session.user.id
      }
    });
    
    if (!interest) {
      return NextResponse.json({ 
        message: "Vous n'avez pas encore exprimé d'intérêt pour cette annonce",
        isInterested: false 
      });
    }
    
    // Delete the interest
    await prisma.interest.delete({
      where: { id: interest.id }
    });
    
    return NextResponse.json({
      message: "Intérêt retiré avec succès",
      isInterested: false
    });
  } catch (error) {
    console.error("Erreur lors du retrait d'intérêt:", error);
    return NextResponse.json(
      { error: "Erreur lors du retrait d'intérêt" },
      { status: 500 }
    );
  }
}

// GET: Check if user is interested in an announcement
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const announcementId = params.id;
    
    // Check if user has expressed interest
    const interest = await prisma.interest.findFirst({
      where: {
        announcementId,
        userId: session.user.id
      }
    });
    
    return NextResponse.json({
      isInterested: !!interest
    });
  } catch (error) {
    console.error("Erreur lors de la vérification d'intérêt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification d'intérêt" },
      { status: 500 }
    );
  }
} 