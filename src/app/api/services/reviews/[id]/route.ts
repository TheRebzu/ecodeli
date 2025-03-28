import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for updating a review
const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;
    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Fetch the review with details
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            type: true,
            serviceProvider: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if this is an anonymous review
    const isAnonymous = review.isVerified === false;
    
    // Process the review - hide author info if anonymous
    const processedReview = isAnonymous
      ? {
          ...review,
          author: {
            id: null,
            name: "Anonymous User",
            image: null,
          },
        }
      : review;

    return NextResponse.json({
      data: processedReview,
    });
  } catch (error: unknown) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;
    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Fetch the review to check ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            serviceProviderId: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Only the author or admin can update a review
    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = review.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "You don't have permission to update this review" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateReviewSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.format() },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {
      ...validatedData.data,
      isVerified: validatedData.data.isAnonymous !== undefined 
        ? !validatedData.data.isAnonymous
        : undefined,
    };

    // Remove isAnonymous from update data since we use isVerified
    if ('isAnonymous' in updateData) {
      delete updateData.isAnonymous;
    }

    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_REVIEW",
        entityType: "REVIEW",
        entityId: reviewId,
        details: `Updated review for service: ${review.service.title}`,
      },
    });

    // Get service provider ID from the service to create notification
    if (review.service.serviceProviderId) {
      const serviceProvider = await prisma.serviceProvider.findUnique({
        where: { id: review.service.serviceProviderId },
        select: { userId: true },
      });

      if (serviceProvider && serviceProvider.userId) {
        // Create notification for the service provider
        await prisma.notification.create({
          data: {
            userId: serviceProvider.userId,
            type: "INFO",
            title: "Review Updated",
            message: `A review for "${review.service.title}" has been updated.`,
            isRead: false,
          },
        });
      }
    }

    return NextResponse.json({
      data: updatedReview,
      message: "Review updated successfully",
    });
  } catch (error: unknown) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;
    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Fetch the review to check ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            serviceProviderId: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Only the author or admin can delete a review
    const isAdmin = session.user.role === "ADMIN";
    const isAuthor = review.authorId === session.user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: "You don't have permission to delete this review" },
        { status: 403 }
      );
    }

    // Delete the review within a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the review
      await tx.review.delete({
        where: { id: reviewId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_REVIEW",
          entityType: "REVIEW",
          entityId: reviewId,
          details: `Deleted review for service: ${review.service.title}`,
        },
      });

      // Notify service provider
      if (review.service.serviceProviderId) {
        const serviceProvider = await tx.serviceProvider.findUnique({
          where: { id: review.service.serviceProviderId },
          select: { userId: true },
        });

        if (serviceProvider && serviceProvider.userId) {
          // Create notification for the service provider
          await tx.notification.create({
            data: {
              userId: serviceProvider.userId,
              type: "INFO",
              title: "Review Deleted",
              message: `A review for "${review.service.title}" has been deleted.`,
              isRead: false,
            },
          });
        }
      }
    });

    return NextResponse.json({
      message: "Review deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
} 