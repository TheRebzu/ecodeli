import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Schema for creating a category
const createCategorySchema = z.object({
  name: z.string().min(1, { message: "Le nom ne peut pas être vide" }),
  description: z.string().optional(),
  icon: z.string().optional()
});

// GET: Get all categories
export async function GET(req: NextRequest) {
  try {
    // Get search parameters
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("search") || "";
    
    // Build query filters
    const where: { 
      name?: { contains: string, mode: 'insensitive' }
    } = {};
    
    if (searchTerm) {
      where.name = { contains: searchTerm, mode: 'insensitive' };
    }
    
    // Fetch categories
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { announcements: true }
        }
      }
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des catégories" },
      { status: 500 }
    );
  }
}

// POST: Create a new category (admin only)
export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }
    
    // Parse and validate request
    const body = await req.json();
    const validation = createCategorySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { name, description, icon } = validation.data;
    
    // Check if category with the same name already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: "Une catégorie avec ce nom existe déjà" },
        { status: 400 }
      );
    }
    
    // Create the category
    const category = await prisma.category.create({
      data: {
        name,
        description,
        icon
      }
    });
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la catégorie:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la catégorie" },
      { status: 500 }
    );
  }
} 