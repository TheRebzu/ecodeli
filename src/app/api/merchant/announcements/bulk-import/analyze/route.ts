import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { z } from "zod";

// Schéma pour validation des données CSV
const csvRowSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  type: z.enum([
    "PACKAGE_DELIVERY",
    "PERSON_TRANSPORT",
    "AIRPORT_TRANSFER",
    "SHOPPING",
    "INTERNATIONAL_PURCHASE",
    "CART_DROP",
  ]),
  basePrice: z.number().min(0),
  pickupAddress: z.string().min(10).max(500),
  deliveryAddress: z.string().min(10).max(500),
  weight: z.number().min(0.1).optional(),
  dimensions: z.string().optional(),
  isFragile: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  pickupDate: z.string().datetime().optional(),
  isUrgent: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 },
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Type de fichier non supporté. Utilisez CSV ou Excel.",
        },
        { status: 400 },
      );
    }

    // Lire le contenu du fichier
    const fileContent = await file.text();

    // Parser CSV simple (pour une vraie implémentation, utiliser une librairie comme 'papaparse')
    const lines = fileContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        {
          error:
            "Le fichier doit contenir au moins un en-tête et une ligne de données",
        },
        { status: 400 },
      );
    }

    // En-têtes attendus
    const expectedHeaders = [
      "title",
      "description",
      "type",
      "basePrice",
      "pickupAddress",
      "deliveryAddress",
      "weight",
      "dimensions",
      "isFragile",
      "requiresInsurance",
      "pickupDate",
      "isUrgent",
    ];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const dataLines = lines.slice(1);

    // Vérification des en-têtes
    const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
    const extraHeaders = headers.filter((h) => !expectedHeaders.includes(h));

    // Analyser chaque ligne
    const results = {
      totalRows: dataLines.length,
      validRows: 0,
      invalidRows: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
      preview: [] as Array<any>,
      warnings: [] as string[],
    };

    // Ajouter les avertissements pour les en-têtes
    if (missingHeaders.length > 0) {
      results.warnings.push(
        `En-têtes manquants : ${missingHeaders.join(", ")}`,
      );
    }
    if (extraHeaders.length > 0) {
      results.warnings.push(
        `En-têtes supplémentaires ignorés : ${extraHeaders.join(", ")}`,
      );
    }

    // Analyser jusqu'à 100 lignes pour l'aperçu
    const maxRows = Math.min(dataLines.length, 100);

    for (let i = 0; i < maxRows; i++) {
      const rowData = dataLines[i]
        .split(",")
        .map((cell) => cell.trim().replace(/"/g, ""));
      const rowNumber = i + 2; // +2 car ligne 1 = en-têtes

      try {
        // Mapper les données selon les en-têtes
        const mappedData: any = {};
        headers.forEach((header, index) => {
          if (
            expectedHeaders.includes(header) &&
            rowData[index] !== undefined
          ) {
            let value = rowData[index];

            // Conversions de type
            if (["basePrice", "weight"].includes(header)) {
              value = parseFloat(value) || 0;
            } else if (
              ["isFragile", "requiresInsurance", "isUrgent"].includes(header)
            ) {
              value = ["true", "1", "oui", "yes"].includes(value.toLowerCase());
            }

            mappedData[header] = value;
          }
        });

        // Valider avec Zod
        const validatedData = csvRowSchema.parse(mappedData);
        results.validRows++;

        // Ajouter à l'aperçu (5 premières lignes valides)
        if (results.preview.length < 5) {
          results.preview.push({
            rowNumber,
            data: validatedData,
          });
        }
      } catch (error) {
        results.invalidRows++;

        let errorMessages: string[] = [];
        if (error instanceof z.ZodError) {
          errorMessages = error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          );
        } else {
          errorMessages = [
            error instanceof Error ? error.message : "Erreur inconnue",
          ];
        }

        results.errors.push({
          row: rowNumber,
          errors: errorMessages,
        });
      }
    }

    // Recommandations
    const recommendations: string[] = [];

    if (results.invalidRows > results.validRows) {
      recommendations.push(
        "Plus de 50% des lignes sont invalides. Vérifiez le format de votre fichier.",
      );
    }

    if (results.validRows === 0) {
      recommendations.push(
        "Aucune ligne valide détectée. Vérifiez le format et les données.",
      );
    }

    if (results.validRows > 100) {
      recommendations.push(
        `${results.validRows} lignes valides détectées. L'import sera effectué par batches de 50.`,
      );
    }

    return NextResponse.json({
      success: true,
      analysis: {
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
        results,
        recommendations,
        canProceed: results.validRows > 0,
        estimatedTime: Math.ceil(results.validRows / 10), // Estimation : 10 annonces/seconde
      },
    });
  } catch (error) {
    console.error("❌ Erreur analyse import CSV:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse du fichier",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
