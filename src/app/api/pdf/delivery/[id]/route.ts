import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { db } from "@/server/db";
import { pdfGenerationService, DeliveryReceiptData } from "@/lib/services/pdf-generation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const deliveryId = params.id;

    // Récupérer la livraison avec toutes les informations nécessaires
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        OR: [
          { clientId: session.user.id },
          { delivererId: session.user.id },
          // Permettre aux admins d'accéder à toutes les livraisons
          ...(session.user.role === "ADMIN" ? [{}] : [])
        ]
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
                address: true,
                city: true,
                postalCode: true
              }
            }
          }
        },
        deliverer: {
          include: {
            user: {
              select: { name }
            },
            drivingLicense: true
          }
        },
        announcement: {
          select: {
            pickupAddress: true,
            deliveryAddress: true,
            description: true,
            packageDetails: true
          }
        },
        signature: true,
        proofPhotos: true
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 }
      );
    }

    // Préparer les données pour la génération PDF
    const receiptData: DeliveryReceiptData = {
      deliveryNumber: delivery.trackingNumber || delivery.id,
      date: delivery.createdAt,
      client: {
        name: delivery.client?.user?.name || "Client",
        address: `${delivery.client?.user?.address || ""}, ${delivery.client?.user?.postalCode || ""} ${delivery.client?.user?.city || ""}`
      },
      deliverer: {
        name: delivery.deliverer?.user?.name || "Livreur",
        license: delivery.deliverer?.drivingLicense || "Non spécifié"
      },
      items: delivery.announcement?.packageDetails ? 
        JSON.parse(delivery.announcement.packageDetails).map((item: any) => ({ description: item.description || item.name || "Article",
          quantity: item.quantity || 1,
          weight: item.weight || undefined
         })) : 
        [{
          description: delivery.announcement?.description || "Livraison",
          quantity: 1
        }],
      pickupAddress: delivery.announcement?.pickupAddress || "Adresse de collecte",
      deliveryAddress: delivery.announcement?.deliveryAddress || "Adresse de livraison",
      signature: delivery.signature || undefined,
      photos: delivery.proofPhotos || undefined,
      notes: delivery.notes || undefined
    };

    // Générer le PDF
    const pdfBuffer = await pdfGenerationService.generateDeliveryReceipt(receiptData);

    // Retourner le PDF avec les en-têtes appropriés
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bon-livraison-${delivery.trackingNumber || delivery.id}.pdf"`,
        "Content-Length": pdfBuffer.length.toString()}});

  } catch (error) {
    console.error("Erreur lors de la génération du PDF de livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}