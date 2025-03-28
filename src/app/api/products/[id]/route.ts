import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for product updates
const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(["g", "kg", "lb", "oz"]).optional(),
  quantity: z.number().int().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Product ID is required"
        }
      }, { status: 400 });
    }

    // Fetch the product with all related data
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        merchant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true
          }
        },
        media: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found"
        }
      }, { status: 404 });
    }

    // Calculate average rating
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
      : null;

    // Return product with additional calculated data
    return NextResponse.json({
      success: true,
      data: {
        ...product,
        averageRating,
        totalReviews: product._count.reviews
      }
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch product"
      }
    }, { status: 500 });
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
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    const productId = params.id;
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Product ID is required"
        }
      }, { status: 400 });
    }

    // Fetch the product to check ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found"
        }
      }, { status: 404 });
    }

    // Check permissions (only the owner merchant or admin can update)
    const isAdmin = session.user.role === "ADMIN";
    const isMerchantOwner = session.user.role === "MERCHANT" && 
                           product.merchant?.userId === session.user.id;

    if (!isAdmin && !isMerchantOwner) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to update this product"
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateProductSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    // Generate new slug if name is updated
    const updateData: Prisma.ProductUpdateInput = { ...validatedData.data };
    
    if (validatedData.data.name) {
      updateData.slug = validatedData.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Handle media connections/disconnections if provided
    if (validatedData.data.mediaIds) {
      // Get current media
      const currentMedia = await prisma.media.findMany({
        where: { products: { some: { id: productId } } },
        select: { id: true }
      });
      
      const currentMediaIds = currentMedia.map(media => media.id);
      const newMediaIds = validatedData.data.mediaIds;
      
      // Determine which media to disconnect and which to connect
      const mediaToDisconnect = currentMediaIds.filter(id => !newMediaIds.includes(id));
      const mediaToConnect = newMediaIds.filter(id => !currentMediaIds.includes(id));
      
      if (mediaToDisconnect.length > 0) {
        updateData.media = {
          ...updateData.media,
          disconnect: mediaToDisconnect.map(id => ({ id }))
        };
      }
      
      if (mediaToConnect.length > 0) {
        updateData.media = {
          ...updateData.media,
          connect: mediaToConnect.map(id => ({ id }))
        };
      }
      
      // Remove mediaIds from update data
      delete updateData.mediaIds;
    }

    // Process update within a transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update the product
      const updated = await tx.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          category: true,
          merchant: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          media: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_PRODUCT",
          entityType: "PRODUCT",
          entityId: productId,
          details: `Product updated: ${product.name}`
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully"
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update product"
      }
    }, { status: 500 });
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
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized"
        }
      }, { status: 401 });
    }

    const productId = params.id;
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Product ID is required"
        }
      }, { status: 400 });
    }

    // Fetch the product to check ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: {
          select: {
            id: true,
            userId: true,
            name: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found"
        }
      }, { status: 404 });
    }

    // Check permissions (only the owner merchant or admin can delete)
    const isAdmin = session.user.role === "ADMIN";
    const isMerchantOwner = session.user.role === "MERCHANT" && 
                           product.merchant?.userId === session.user.id;

    if (!isAdmin && !isMerchantOwner) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to delete this product"
        }
      }, { status: 403 });
    }

    // Check if the product is part of any active orders
    const activeOrders = await prisma.orderItem.count({
      where: {
        productId,
        order: {
          status: {
            notIn: ["DELIVERED", "CANCELLED", "REJECTED"]
          }
        }
      }
    });

    if (activeOrders > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: "ACTIVE_ORDERS",
          message: "Cannot delete a product with active orders"
        }
      }, { status: 400 });
    }

    // Process deletion within a transaction
    await prisma.$transaction(async (tx) => {
      // Remove product relations
      await tx.product.update({
        where: { id: productId },
        data: {
          media: {
            disconnect: await tx.media.findMany({
              where: { products: { some: { id: productId } } },
              select: { id: true }
            })
          }
        }
      });
      
      // Delete the product
      await tx.product.delete({
        where: { id: productId }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_PRODUCT",
          entityType: "PRODUCT",
          entityId: productId,
          details: `Product deleted: ${product.name} from merchant: ${product.merchant?.name}`
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete product"
      }
    }, { status: 500 });
  }
} 