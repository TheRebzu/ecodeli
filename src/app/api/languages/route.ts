import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema for adding a new language
const addLanguageSchema = z.object({
  code: z.string().min(2).max(5),
  name: z.string().min(2).max(50),
  nativeName: z.string().min(2).max(50),
  isRTL: z.boolean().default(false),
  isActive: z.boolean().default(true),
  flagIcon: z.string().optional(),
});

// GET: Retrieve available languages
export async function GET() {
  try {
    // List of supported languages
    const languages = [
      {
        code: "fr",
        name: "French",
        nativeName: "Français",
        isRTL: false,
        isActive: true,
        flagIcon: "fr",
        translationProgress: 100, // percentage
        isDefault: true,
      },
      {
        code: "en",
        name: "English",
        nativeName: "English",
        isRTL: false,
        isActive: true,
        flagIcon: "gb",
        translationProgress: 100, // percentage
        isDefault: false,
      },
      {
        code: "de",
        name: "German",
        nativeName: "Deutsch",
        isRTL: false,
        isActive: true,
        flagIcon: "de",
        translationProgress: 85, // percentage
        isDefault: false,
      },
      {
        code: "es",
        name: "Spanish",
        nativeName: "Español",
        isRTL: false,
        isActive: true,
        flagIcon: "es",
        translationProgress: 90, // percentage
        isDefault: false,
      },
      {
        code: "it",
        name: "Italian",
        nativeName: "Italiano",
        isRTL: false,
        isActive: true,
        flagIcon: "it",
        translationProgress: 80, // percentage
        isDefault: false,
      },
      {
        code: "ar",
        name: "Arabic",
        nativeName: "العربية",
        isRTL: true,
        isActive: true,
        flagIcon: "sa",
        translationProgress: 70, // percentage
        isDefault: false,
      },
    ];

    return NextResponse.json({
      data: languages,
    });
  } catch (error: unknown) {
    console.error("Error fetching languages:", error);
    return NextResponse.json(
      { error: "Failed to fetch languages" },
      { status: 500 }
    );
  }
}

// PUT: Add or update a language (admin only)
export async function PUT(req: NextRequest) {
  try {
    // Authenticate user and check admin role
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = addLanguageSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validatedBody.error.format() },
        { status: 400 }
      );
    }

    const { code, name, nativeName, isRTL, isActive, flagIcon } = validatedBody.data;

    // In a real application, we would store this in the database
    // For this example, we'll just return the added language
    const newLanguage = {
      code,
      name,
      nativeName,
      isRTL,
      isActive,
      flagIcon: flagIcon || code.slice(0, 2).toLowerCase(),
      translationProgress: 0, // New language starts with 0% translation
      isDefault: false,
    };

    return NextResponse.json({
      data: newLanguage,
      message: "Language added successfully",
    });
  } catch (error: unknown) {
    console.error("Error adding language:", error);
    return NextResponse.json(
      { error: "Failed to add language" },
      { status: 500 }
    );
  }
} 