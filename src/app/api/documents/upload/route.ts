import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { DocumentService } from "@/server/services/common/document.service";
import { documentTypeSchema } from "@/schemas/common/document.schema";
import { z } from "zod";

const documentService = new DocumentService();

// Schema pour la validation
const uploadSchema = z.object({
  type: documentTypeSchema,
  file: z.string(), // Base64 string
  notes: z.string().optional(),
  expiryDate: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Parse le body de la requête
    const body = await request.json();
    console.log("📤 API Upload - Données reçues:", {
      bodyKeys: Object.keys(body),
      type: body.type,
      fileLength: body.file ? body.file.length : 0,
      hasFile: !!body.file
    });

    // Valider les données
    const validatedData = uploadSchema.parse(body);

    // Vérifier le format base64
    if (!validatedData.file.startsWith('data:')) {
      return NextResponse.json(
        { error: "Format de fichier invalide - base64 requis" },
        { status: 400 }
      );
    }

    // Convertir expiryDate si présent
    let expiryDate: Date | undefined;
    if (validatedData.expiryDate) {
      expiryDate = new Date(validatedData.expiryDate);
    }

         // Appeler le service de documents avec la nouvelle méthode
     const result = await documentService.uploadDocumentFromBase64({
       userId: session.user.id,
       type: validatedData.type,
       file: validatedData.file,
       notes: validatedData.notes,
       expiryDate
     });

    console.log("✅ Document uploadé avec succès:", {
      documentId: result.id,
      type: result.documentType,
      status: result.status
    });

    return NextResponse.json({
      success: true,
      document: result
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de l'upload:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Données de validation invalides", 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Erreur lors de l'upload du document",
        message: error.message 
      },
      { status: 500 }
    );
  }
} 