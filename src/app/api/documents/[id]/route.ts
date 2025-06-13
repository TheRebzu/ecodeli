import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { TRPCError } from "@trpc/server";
import path from "path";
import { readFile } from "fs/promises";

/**
 * Gestionnaire GET pour accéder à un document par son ID
 * Vérifie les permissions d'accès et retourne le fichier
 * Note: Ce point d'API doit rester car il sert les fichiers directement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    if (!documentId) {
      return new NextResponse("ID de document manquant", { status: 400 });
    }

    // Vérifier l'authentification
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    // Utiliser tRPC pour récupérer le document
    const ctx = await createTRPCContext({
      req: request as any,
      res: {} as any,
      info: {} as any,
      auth: { session },
    });
    const caller = appRouter.createCaller(ctx);

    try {
      // Appeler la procédure tRPC
      const document = await caller.document.getDocumentById({ documentId });

      if (!document) {
        return new NextResponse("Document non trouvé", { status: 404 });
      }

      // Lire le fichier du document
      const filePath = document.fileUrl;
      const fullPath = path.join(process.cwd(), "public", filePath);

      try {
        const fileBuffer = await readFile(fullPath);

        // Déterminer le type MIME du fichier
        const contentType = document.mimeType || "application/octet-stream";

        // Configurer les en-têtes pour le téléchargement
        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set(
          "Content-Disposition",
          `inline; filename="${document.filename}"`,
        );

        return new NextResponse(fileBuffer, {
          status: 200,
          headers,
        });
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier:", error);
        return new NextResponse("Fichier introuvable", { status: 404 });
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        if (error.code === "NOT_FOUND") {
          return new NextResponse("Document non trouvé", { status: 404 });
        } else if (error.code === "FORBIDDEN") {
          return new NextResponse("Accès non autorisé", { status: 403 });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de l'accès au document:", error);
    return new NextResponse("Erreur interne du serveur", { status: 500 });
  }
}

/**
 * Gestionnaire DELETE pour supprimer un document par son ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    // Vérifier l'authentification
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Utiliser tRPC pour supprimer le document
    const ctx = await createTRPCContext({
      req: request as any,
      res: {} as any,
      info: {} as any,
      auth: { session },
    });
    const caller = appRouter.createCaller(ctx);

    try {
      // Appeler la procédure tRPC
      await caller.document.deleteDocument({ documentId });
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof TRPCError) {
        if (error.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: "Document non trouvé" },
            { status: 404 },
          );
        } else if (error.code === "FORBIDDEN") {
          return NextResponse.json(
            { error: "Accès non autorisé" },
            { status: 403 },
          );
        }

        return NextResponse.json(
          { error: error.message },
          { status: getHttpStatusFromTRPCError(error) },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de la suppression du document:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

// Helper pour convertir les codes d'erreur tRPC en codes HTTP
function getHttpStatusFromTRPCError(error: TRPCError): number {
  switch (error.code) {
    case "BAD_REQUEST":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "TIMEOUT":
      return 408;
    case "CONFLICT":
      return 409;
    case "PRECONDITION_FAILED":
      return 412;
    case "PAYLOAD_TOO_LARGE":
      return 413;
    case "METHOD_NOT_SUPPORTED":
      return 405;
    case "UNPROCESSABLE_CONTENT":
      return 422;
    case "TOO_MANY_REQUESTS":
      return 429;
    default:
      return 500;
  }
}
