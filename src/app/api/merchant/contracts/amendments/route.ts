import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        contract: {
          include: {
            amendments: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    if (!merchant || !merchant.contract) {
      return NextResponse.json({
        success: true,
        amendments: [],
      });
    }

    return NextResponse.json({
      success: true,
      amendments: merchant.contract.amendments.map((amendment) => ({
        id: amendment.id,
        version: amendment.version,
        title: amendment.title,
        description: amendment.description,
        changes: amendment.changes,
        effectiveDate: amendment.effectiveDate,
        requestedAt: amendment.createdAt,
        merchantSignedAt: amendment.merchantSignedAt,
        adminSignedAt: amendment.adminSignedAt,
        adminSignedBy: amendment.adminSignedBy,
      })),
    });
  } catch (error) {
    console.error("❌ Erreur récupération avenants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, changes, effectiveDate } = body;

    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: { contract: true },
    });

    if (!merchant || !merchant.contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 },
      );
    }

    // Générer une nouvelle version
    const currentVersion = merchant.contract.version || "1.0";
    const versionParts = currentVersion.split(".");
    const newMinorVersion = parseInt(versionParts[1] || "0") + 1;
    const newVersion = `${versionParts[0]}.${newMinorVersion}`;

    const amendment = await db.contractAmendment.create({
      data: {
        contractId: merchant.contract.id,
        version: newVersion,
        title,
        description,
        changes,
        effectiveDate: new Date(effectiveDate),
      },
    });

    return NextResponse.json({
      success: true,
      amendment: {
        id: amendment.id,
        version: amendment.version,
        title: amendment.title,
        description: amendment.description,
        changes: amendment.changes,
        effectiveDate: amendment.effectiveDate,
        requestedAt: amendment.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Erreur création avenant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
