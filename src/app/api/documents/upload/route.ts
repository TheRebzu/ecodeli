import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
// @ts-ignore - Ce package nécessite d'être installé via "npm install formidable"
import formidable from "formidable";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { TRPCError } from "@trpc/server";
import { DocumentType } from "@prisma/client";
import fs from "fs/promises";

// Désactive le bodyParser pour permettre la lecture des FormData
export const config = {
  api: { bodyParser: false }};

const UPLOAD_DIR = process.cwd() + "/public/uploads";

// Fonction pour s'assurer que le répertoire d'upload existe
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

async function readFormData(req: NextRequest) {
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
    (resolve, reject) => {
      // Assurer l'existence du répertoire avant de créer le formulaire
      ensureUploadDir()
        .then(() => {
          const form = formidable({ uploadDir: UPLOAD_DIR,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
           });

          form.parse(req as any, (err, fields, files) => {
            if (err) {
              reject(err);
            } else {
              resolve({ fields, files  });
            }
          });
        })
        .catch(reject);
    },
  );
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Lecture du formulaire via formidable
    const { fields, files } = await readFormData(req);

    // Récupérer le fichier et les métadonnées
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const documentType = Array.isArray(fields.type)
      ? fields.type[0]
      : (fields.type as string);
    const expiryDateStr = Array.isArray(fields.expiryDate)
      ? fields.expiryDate[0]
      : (fields.expiryDate as string | undefined);

    if (!file || !documentType) {
      return NextResponse.json(
        { error: "Fichier ou type manquant" },
        { status: 400 },
      );
    }

    // Créer le contexte tRPC pour l'appel au routeur
    const ctx = await createTRPCContext({
      req: req as any,
      res: {} as any,
      info: {} as any,
      auth: { session }});

    const caller = appRouter.createCaller(ctx);

    // Convertir expiryDate si présent
    let expiryDate: Date | undefined;
    if (expiryDateStr) {
      expiryDate = new Date(expiryDateStr);
    }

    // Appeler la procédure tRPC uploadDocument
    const result = await caller.document.uploadDocument({ file,
      type: documentType as DocumentType,
      expiryDate,
      notes: Array.isArray(fields.notes)
        ? fields.notes[0]
        : (fields.notes as string | undefined) });

    return NextResponse.json({ success: true,
      document: result });
  } catch (error: any) {
    console.error("Error uploading document:", error);

    if (error instanceof TRPCError) {
      return NextResponse.json(
        { error: error.message },
        { status: getHttpStatusFromTRPCError(error) },
      );
    }

    return NextResponse.json(
      {
        error:
          error.message || "Une erreur est survenue lors du téléchargement"},
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
