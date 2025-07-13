import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, review } = await request.json();

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // Récupérer la livraison
    const { id } = await params;
    const delivery = await db.delivery.findFirst({
      where: {
        id: id,
        announcement: {
          clientId: session.user.id,
        },
        status: "DELIVERED",
      },
      include: {
        announcement: true,
        deliverer: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery not found or not delivered" },
        { status: 404 },
      );
    }

    // V�rifier si d�j� not�
    if (delivery.rating) {
      return NextResponse.json(
        { error: "Delivery already rated" },
        { status: 400 },
      );
    }

    // Transaction pour noter la livraison et mettre � jour le livreur
    await db.$transaction(async (tx) => {
      // Mettre à jour la livraison avec la note
      await tx.delivery.update({
        where: { id: id },
        data: {
          rating,
          review,
          ratedAt: new Date(),
        },
      });

      // Cr�er un review
      await tx.review.create({
        data: {
          clientId: session.user.id,
          delivererId: delivery.delivererId!,
          deliveryId: delivery.id,
          rating,
          comment: review,
          serviceType: "DELIVERY",
        },
      });

      // Recalculer la note moyenne du livreur
      const delivererReviews = await tx.review.findMany({
        where: { delivererId: delivery.delivererId! },
      });

      const averageRating =
        delivererReviews.reduce((sum, r) => sum + r.rating, 0) /
        delivererReviews.length;

      // Mettre � jour la note du livreur
      await tx.deliverer.update({
        where: { id: delivery.delivererId! },
        data: { rating: averageRating },
      });

      // Notification pour le livreur
      await tx.notification.create({
        data: {
          userId: delivery.deliverer!.userId,
          type: "REVIEW_RECEIVED",
          title: "Nouvelle �valuation",
          message: `Vous avez re�u une note de ${rating}/5 pour votre livraison.`,
          status: "UNREAD",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "�valuation enregistr�e avec succ�s",
    });
  } catch (error) {
    console.error("Error rating delivery:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
