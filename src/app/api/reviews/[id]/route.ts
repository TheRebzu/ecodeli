import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for updating reviews
const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(3).max(100).optional(),
  content: z.string().min(10).max(1000).optional(),
  isAnonymous: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the review
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true
          }
        },
        service: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        delivery: {
          select: {
            id: true,
            status: true,
            deliveryDate: true
          }
        }
      }
    });

    if (!review) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Review not found"
        }
      }, { status: 404 });
    }

    // Respect anonymity setting
    const processedReview = review.isAnonymous
      ? {
          ...review,
          user: {
            id: null,
            name: "Anonymous User",
            image: null
          }
        }
      : review;

    return NextResponse.json({
      success: true,
      data: processedReview
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch review"
      }
    }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    // Fetch the review to check ownership
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Review not found"
        }
      }, { status: 404 });
    }

    // Check if user is the owner or an admin
    const isOwner = review.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to update this review"
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateReviewSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid review data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { rating, title, content, isAnonymous } = validatedData.data;

    // Check if there's anything to update
    if (!rating && !title && !content && isAnonymous === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "No update data provided"
        }
      }, { status: 400 });
    }

    // Update the review in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the review
      const updatedReview = await tx.review.update({
        where: { id },
        data: {
          ...(rating !== undefined && { rating }),
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(isAnonymous !== undefined && { isAnonymous }),
          updatedAt: new Date()
        }
      });

      // If rating was updated, update average rating for the associated entity
      if (rating !== undefined) {
        if (review.productId) {
          const productReviews = await tx.review.aggregate({
            where: { productId: review.productId },
            _avg: { rating: true },
            _count: true
          });

          await tx.product.update({
            where: { id: review.productId },
            data: {
              averageRating: productReviews._avg.rating || rating,
              reviewCount: productReviews._count
            }
          });
        }

        if (review.serviceId) {
          const serviceReviews = await tx.review.aggregate({
            where: { serviceId: review.serviceId },
            _avg: { rating: true },
            _count: true
          });

          await tx.service.update({
            where: { id: review.serviceId },
            data: {
              averageRating: serviceReviews._avg.rating || rating,
              reviewCount: serviceReviews._count
            }
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_REVIEW",
          entityType: "REVIEW",
          entityId: id,
          details: `Review updated${rating ? ` with new rating: ${rating}` : ''}`
        }
      });

      return updatedReview;
    });

    // Return success response with updated review data
    return NextResponse.json({
      success: true,
      data: result,
      message: "Review updated successfully"
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update review"
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    // Fetch the review to check ownership and get associated entity
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Review not found"
        }
      }, { status: 404 });
    }

    // Check if user is the owner or an admin
    const isOwner = review.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to delete this review"
        }
      }, { status: 403 });
    }

    // Delete the review in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the review
      await tx.review.delete({
        where: { id }
      });

      // Update average rating for the associated entity
      if (review.productId) {
        const productReviews = await tx.review.aggregate({
          where: { productId: review.productId },
          _avg: { rating: true },
          _count: true
        });

        await tx.product.update({
          where: { id: review.productId },
          data: {
            averageRating: productReviews._avg.rating || 0,
            reviewCount: productReviews._count
          }
        });
      }

      if (review.serviceId) {
        const serviceReviews = await tx.review.aggregate({
          where: { serviceId: review.serviceId },
          _avg: { rating: true },
          _count: true
        });

        await tx.service.update({
          where: { id: review.serviceId },
          data: {
            averageRating: serviceReviews._avg.rating || 0,
            reviewCount: serviceReviews._count
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_REVIEW",
          entityType: "REVIEW",
          entityId: id,
          details: `Review deleted for ${review.productId ? 'product' : review.serviceId ? 'service' : 'delivery'}`
        }
      });
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete review"
      }
    }, { status: 500 });
  }
} 