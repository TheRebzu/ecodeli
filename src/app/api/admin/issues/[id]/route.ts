import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating issue resolution
const issueResolutionSchema = z.object({
  resolution: z.string().min(1, { message: "La résolution est requise" }),
  status: z.enum(["RESOLVED", "CLOSED", "ESCALATED"]),
  internalNotes: z.string().optional(),
});

// PATCH: Resolve an issue
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    const issueId = params.id;
    
    // Check if issue exists
    const issue = await prisma.supportTicket.findUnique({
      where: { id: issueId },
      include: {
        user: true,
        shipment: true
      }
    });
    
    if (!issue) {
      return NextResponse.json(
        { error: "Problème non trouvé" },
        { status: 404 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = issueResolutionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { data } = validationResult;
    
    // Update the issue
    const updatedIssue = await prisma.supportTicket.update({
      where: { id: issueId },
      data: {
        status: data.status,
        resolution: data.resolution,
        resolvedAt: new Date(),
        ...(data.internalNotes && { internalNotes: data.internalNotes }),
        resolvedBy: session.user.email
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Send notification to the user who reported the issue (placeholder)
    // This would integrate with your notification system
    
    return NextResponse.json({
      message: "Problème résolu avec succès",
      data: updatedIssue
    });
    
  } catch (error) {
    console.error("Erreur lors de la résolution du problème:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la résolution du problème" },
      { status: 500 }
    );
  }
} 