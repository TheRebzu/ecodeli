import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { nanoid } from "nanoid";

// Types pour les types de fichiers autorisés
type AllowedMimeType = "image/jpeg" | "image/png" | "application/pdf";

// Configuration pour chaque type d'upload
const uploadConfig = {
  driverDocument: {
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"] as AllowedMimeType[],
    maxSize: 5 * 1024 * 1024, // 5MB
    directory: "uploads/driver-documents",
  },
  businessLogo: {
    allowedTypes: ["image/jpeg", "image/png"] as AllowedMimeType[],
    maxSize: 2 * 1024 * 1024, // 2MB
    directory: "uploads/business-logos",
  },
  certifications: {
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"] as AllowedMimeType[],
    maxSize: 10 * 1024 * 1024, // 10MB
    directory: "uploads/certifications",
  },
};

// Types de uploads autorisés
type UploadType = keyof typeof uploadConfig;

// Créer le répertoire de destination s'il n'existe pas
async function createDirectoryIfNotExists(directory: string) {
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    console.error("Erreur lors de la création du répertoire:", error);
    throw new Error("Impossible de créer le répertoire de destination");
  }
}

// Endpoint pour gérer l'upload des fichiers
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const uploadType = params.type as UploadType;

    // Vérifier si le type d'upload est valide
    if (!uploadConfig[uploadType]) {
      return NextResponse.json(
        { message: `Type d'upload non valide: ${uploadType}` },
        { status: 400 }
      );
    }

    const config = uploadConfig[uploadType];
    
    // Analyser le corps de la requête en FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Vérifier si un fichier a été fourni
    if (!file) {
      return NextResponse.json(
        { message: "Aucun fichier n'a été fourni" },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    if (!config.allowedTypes.includes(file.type as AllowedMimeType)) {
      return NextResponse.json(
        {
          message: `Type de fichier non autorisé. Types acceptés: ${config.allowedTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier
    if (file.size > config.maxSize) {
      return NextResponse.json(
        {
          message: `Fichier trop volumineux. Taille maximale: ${
            config.maxSize / (1024 * 1024)
          }MB`,
        },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const uniqueId = nanoid(10);
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${uniqueId}.${fileExtension}`;
    const directory = join(process.cwd(), "public", config.directory);
    const filePath = join(directory, fileName);
    
    // Créer le répertoire s'il n'existe pas
    await createDirectoryIfNotExists(directory);
    
    // Convertir le fichier en tampon d'octets
    const fileBuffer = await file.arrayBuffer();
    
    // Écrire le fichier sur le disque
    await writeFile(filePath, Buffer.from(fileBuffer));
    
    // Construire l'URL publique du fichier
    const fileUrl = `/${config.directory}/${fileName}`;

    return NextResponse.json({ url: fileUrl }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de l'upload du fichier:", error);
    return NextResponse.json(
      { message: "Erreur lors de l'upload du fichier" },
      { status: 500 }
    );
  }
} 