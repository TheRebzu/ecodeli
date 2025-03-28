import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for updating cart drops
const updateCartDropSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  isPublic: z.boolean().optional(),
  expireAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the cart drop with related data
    const cartDrop = await prisma.cartDrop.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                price: true,
                images: true,
                averageRating: true,
                inStock: true,
              }
            }
          }
        },
        _count: {
          select: {
            copyCount: true,
            viewCount: true,
            items: true,
          }
        }
      }
    });

    if (!cartDrop) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Cart drop not found"
        }
      }, { status: 404 });
    }

    // Check access permissions
    if (!cartDrop.isPublic) {
      const session = await getServerSession(authOptions);
      
      // If not public, only creator can see it
      if (!session?.user || session.user.id !== cartDrop.creatorId) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to view this cart drop"
          }
        }, { status: 403 });
      }
    }

    // Update view count asynchronously (don't await to avoid delay)
    prisma.cartDrop.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    }).catch(err => console.error("Failed to update view count:", err));

    // Calculate total value of items in cart drop
    const totalValue = cartDrop.items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity), 
      0
    );

    // Return cart drop with its details
    return NextResponse.json({
      success: true,
      data: {
        ...cartDrop,
        totalValue,
        isExpired: cartDrop.expireAt ? new Date(cartDrop.expireAt) < new Date() : false
      }
    });
  } catch (error) {
    console.error("Error fetching cart drop:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch cart drop"
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
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to update a cart drop"
        }
      }, { status: 401 });
    }

    // Fetch the cart drop to check ownership
    const cartDrop = await prisma.cartDrop.findUnique({
      where: { id }
    });

    if (!cartDrop) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Cart drop not found"
        }
      }, { status: 404 });
    }

    // Check if user is the creator or an admin
    const isCreator = cartDrop.creatorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to update this cart drop"
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = updateCartDropSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid cart drop data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { 
      name, 
      description, 
      isPublic, 
      expireAt, 
      tags,
      status
    } = validatedData.data;

    // Update cart drop in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: Prisma.CartDropUpdateInput = {};
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (expireAt !== undefined) updateData.expireAt = expireAt ? new Date(expireAt) : null;
      if (tags !== undefined) updateData.tags = tags;
      if (status !== undefined) updateData.status = status;
      
      // Update the cart drop
      const updatedCartDrop = await tx.cartDrop.update({
        where: { id },
        data: updateData
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_CART_DROP",
          entityType: "CART_DROP",
          entityId: id,
          details: `Updated cart drop "${updatedCartDrop.name}"`
        }
      });

      return updatedCartDrop;
    });

    // Return success response with updated cart drop
    return NextResponse.json({
      success: true,
      data: result,
      message: "Cart drop updated successfully"
    });
  } catch (error) {
    console.error("Error updating cart drop:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update cart drop"
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
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete a cart drop"
        }
      }, { status: 401 });
    }

    // Fetch the cart drop to check ownership
    const cartDrop = await prisma.cartDrop.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    if (!cartDrop) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Cart drop not found"
        }
      }, { status: 404 });
    }

    // Check if user is the creator or an admin
    const isCreator = cartDrop.creatorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to delete this cart drop"
        }
      }, { status: 403 });
    }

    // Delete cart drop in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all items in the cart drop first
      await tx.cartDropItem.deleteMany({
        where: { cartDropId: id }
      });

      // Delete the cart drop
      await tx.cartDrop.delete({
        where: { id }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_CART_DROP",
          entityType: "CART_DROP",
          entityId: id,
          details: `Deleted cart drop "${cartDrop.name}" with ${cartDrop._count.items} items`
        }
      });
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Cart drop deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting cart drop:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to delete cart drop"
      }
    }, { status: 500 });
  }
} 