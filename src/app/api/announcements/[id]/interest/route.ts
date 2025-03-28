import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST: Express interest in an advertisement
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
    
    const advertisementId = params.id;
    
    // Check if advertisement exists
    const advertisement = await prisma.driverAdvertisement.findUnique({
      where: { id: advertisementId },
      include: { driver: true }
    });
    
    if (!advertisement) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }
    
    // Check if advertisement is active
    if (advertisement.status !== "ACTIVE") {
      return NextResponse.json({ error: "Cette annonce n'est pas active" }, { status: 400 });
    }
    
    // Ensure user is not the driver of the advertisement
    if (advertisement.driver.userId === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas exprimer de l'intérêt pour votre propre annonce" }, { status: 400 });
    }
    
    // Find user's customer profile
    const customerProfile = await prisma.customer.findFirst({
      where: { userId: session.user.id }
    });
    
    if (!customerProfile) {
      return NextResponse.json({ error: "Profil client non trouvé" }, { status: 400 });
    }
    
    // Check if user already expressed interest
    const existingInterest = await prisma.adInterest.findFirst({
      where: {
        advertisementId,
        customerId: customerProfile.id
      }
    });
    
    if (existingInterest) {
      // If already exists, remove it (toggle interest)
      await prisma.adInterest.delete({
        where: { id: existingInterest.id }
      });
      
      return NextResponse.json({ 
        message: "Intérêt retiré", 
        interested: false 
      });
    }
    
    // Create new interest record
    await prisma.adInterest.create({
      data: {
        advertisement: { connect: { id: advertisementId } },
        customer: { connect: { id: customerProfile.id } }
      }
    });
    
    return NextResponse.json({ 
      message: "Intérêt exprimé avec succès", 
      interested: true 
    });
  } catch (error) {
    console.error("Erreur lors de l'expression d'intérêt:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'expression d'intérêt" },
      { status: 500 }
    );
  }
}

// GET: Check if user has expressed interest in an advertisement
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
    
    const advertisementId = params.id;
    
    // Find user's customer profile
    const customerProfile = await prisma.customer.findFirst({
      where: { userId: session.user.id }
    });
    
    if (!customerProfile) {
      return NextResponse.json({ error: "Profil client non trouvé" }, { status: 400 });
    }
    
    // Check if user has expressed interest
    const interest = await prisma.adInterest.findFirst({
      where: {
        advertisementId,
        customerId: customerProfile.id
      }
    });
    
    return NextResponse.json({ 
      interested: !!interest
    });
  } catch (error) {
    console.error("Erreur lors de la vérification d'intérêt:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification d'intérêt" },
      { status: 500 }
    );
  }
} 