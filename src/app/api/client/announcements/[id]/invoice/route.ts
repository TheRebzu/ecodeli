import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { InvoiceGeneratorService } from "@/features/invoices/services/invoice-generator.service";
import { announcementService } from "@/features/announcements/services/announcement.service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * GET - Récupérer ou générer la facture d'une annonce
 * Accessible uniquement après validation de livraison
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: announcementId } = await params;
    const user = await getUserFromSession(request);

    if (!user || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Accès refusé - Rôle CLIENT requis" },
        { status: 403 },
      );
    }

    logger.info(
      `Récupération facture pour annonce ${announcementId} par client ${user.id}`,
    );

    // Récupérer l'annonce pour vérifier les permissions et le statut
    const announcement =
      await announcementService.getAnnouncementById(announcementId);

    // Vérifier les permissions
    if (announcement.authorId !== user.id) {
      return NextResponse.json(
        { error: "Annonce non autorisée" },
        { status: 403 },
      );
    }

    // Vérifier que la livraison est terminée
    if (
      announcement.status !== "COMPLETED" ||
      announcement.delivery?.status !== "DELIVERED"
    ) {
      return NextResponse.json(
        {
          error:
            "La facture n'est disponible qu'après validation de la livraison",
          currentStatus: announcement.status,
          deliveryStatus: announcement.delivery?.status || "NO_DELIVERY",
        },
        { status: 400 },
      );
    }

    // Chercher une facture existante
    let existingInvoice = await prisma.invoice.findFirst({
      where: {
        metadata: {
          path: ["announcementId"],
          equals: announcementId,
        },
        type: "DELIVERY",
      },
    });

    let invoiceUrl: string;

    if (existingInvoice && existingInvoice.pdfUrl) {
      // Facture déjà générée
      invoiceUrl = existingInvoice.pdfUrl;
      logger.info(`Facture existante trouvée: ${invoiceUrl}`);
    } else {
      // Générer une nouvelle facture
      try {
        invoiceUrl =
          await InvoiceGeneratorService.generateAnnouncementInvoice(
            announcementId,
          );
        logger.info(`Nouvelle facture générée: ${invoiceUrl}`);
      } catch (error) {
        logger.error("Erreur génération facture:", error);
        return NextResponse.json(
          {
            error: "Erreur lors de la génération de la facture",
            details: error instanceof Error ? error.message : "Erreur interne",
          },
          { status: 500 },
        );
      }
    }

    // Récupérer les détails mis à jour de la facture
    const invoice = await prisma.invoice.findFirst({
      where: {
        metadata: {
          path: ["announcementId"],
          equals: announcementId,
        },
        type: "DELIVERY",
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Facture introuvable après génération",
        },
        { status: 500 },
      );
    }

    const response = {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        status: invoice.status,
        total: invoice.total,
        currency: invoice.currency,
        pdfUrl: invoice.pdfUrl,
      },
      announcement: {
        id: announcement.id,
        title: announcement.title,
        finalPrice: announcement.finalPrice || announcement.basePrice,
        currency: announcement.currency || "EUR",
      },
      delivery: announcement.delivery
        ? {
            id: announcement.delivery.id,
            trackingNumber: announcement.delivery.trackingNumber,
            deliveredAt: announcement.delivery.actualDeliveryDate,
            deliverer: announcement.delivery.deliverer
              ? {
                  name: `${announcement.delivery.deliverer.profile?.firstName || ""} ${announcement.delivery.deliverer.profile?.lastName || ""}`.trim(),
                }
              : null,
          }
        : null,
      download: {
        url: invoice.pdfUrl,
        filename: `facture-ecodeli-${announcement.id.slice(-8)}.pdf`,
        contentType: "application/pdf",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Erreur récupération facture:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de la facture",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Régénérer une facture (en cas de problème)
 * Accessible uniquement aux admins ou en cas d'erreur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: announcementId } = await params;
    const user = await getUserFromSession(request);

    if (!user || !["CLIENT", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { force = false, reason = "Régénération demandée" } = body;

    logger.info(
      `Régénération facture pour annonce ${announcementId} par ${user.role} ${user.id}`,
    );

    // Récupérer l'annonce
    const announcement =
      await announcementService.getAnnouncementById(announcementId);

    // Vérifier les permissions pour les clients
    if (user.role === "CLIENT" && announcement.authorId !== user.id) {
      return NextResponse.json(
        { error: "Annonce non autorisée" },
        { status: 403 },
      );
    }

    // Vérifier que la livraison est terminée
    if (announcement.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error:
            "Impossible de générer une facture pour une livraison non terminée",
        },
        { status: 400 },
      );
    }

    // Vérifier s'il existe déjà une facture
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        metadata: {
          path: ["announcementId"],
          equals: announcementId,
        },
        type: "DELIVERY",
      },
    });

    if (existingInvoice && !force && user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Une facture existe déjà pour cette annonce",
          existingInvoice: {
            id: existingInvoice.id,
            invoiceNumber: existingInvoice.invoiceNumber,
            pdfUrl: existingInvoice.pdfUrl,
          },
          message: "Utilisez force=true pour régénérer ou contactez le support",
        },
        { status: 409 },
      );
    }

    // Marquer l'ancienne facture comme archivée si elle existe
    if (existingInvoice) {
      await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          metadata: {
            ...(existingInvoice.metadata as any),
            archived: true,
            archivedAt: new Date().toISOString(),
            regenerationReason: reason,
            regeneratedBy: user.id,
          },
        },
      });
    }

    // Générer une nouvelle facture
    const invoiceUrl =
      await InvoiceGeneratorService.generateAnnouncementInvoice(announcementId);

    // Créer une entrée de tracking pour traçabilité
    await prisma.announcementTracking.create({
      data: {
        announcementId,
        status: "INVOICE_REGENERATED",
        message: `Facture régénérée: ${reason}`,
        createdBy: user.id,
        isPublic: false,
        metadata: {
          reason,
          regeneratedBy: user.id,
          userRole: user.role,
          previousInvoiceId: existingInvoice?.id,
        },
      },
    });

    logger.info(`Facture régénérée avec succès: ${invoiceUrl}`);

    return NextResponse.json({
      success: true,
      message: "Facture régénérée avec succès",
      invoice: {
        url: invoiceUrl,
        regeneratedAt: new Date().toISOString(),
        reason,
      },
    });
  } catch (error) {
    logger.error("Erreur régénération facture:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la régénération de la facture",
        details: error instanceof Error ? error.message : "Erreur interne",
      },
      { status: 500 },
    );
  }
}
