import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema for adding items to cart drops
const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  note: z.string().max(200).optional(),
});

// Schema for deleting items from cart drops
const deleteItemSchema = z.object({
  itemId: z.string().uuid(),
});

// Schema for query parameters
const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(["createdAt", "price"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verify cart drop exists
    const cartDrop = await prisma.cartDrop.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPublic: true,
        creatorId: true,
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

    // Check access permissions for private cart drops
    if (!cartDrop.isPublic) {
      const session = await getServerSession(authOptions);
      
      // If not public, only creator can see items
      if (!session?.user || session.user.id !== cartDrop.creatorId) {
        return NextResponse.json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to view this cart drop's items"
          }
        }, { status: 403 });
      }
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = queryParamsSchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_PARAMETERS",
          message: "Invalid query parameters",
          details: validatedQuery.error.format()
        }
      }, { status: 400 });
    }

    const {
      page,
      limit,
      sortBy,
      sortOrder
    } = validatedQuery.data;

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Determine sorting - special handling for price which is in the product relation
    let orderBy: Prisma.CartDropItemOrderByWithRelationInput;
    if (sortBy === "price") {
      orderBy = {
        product: {
          price: sortOrder
        }
      };
    } else {
      orderBy = {
        [sortBy]: sortOrder
      };
    }

    // Fetch items with pagination
    const [items, totalCount] = await Promise.all([
      prisma.cartDropItem.findMany({
        where: { cartDropId: id },
        orderBy,
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
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.cartDropItem.count({ where: { cartDropId: id } })
    ]);

    // Calculate total value
    const totalValue = items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity), 
      0
    );

    // Return items with metadata
    return NextResponse.json({
      success: true,
      data: {
        cartDrop: {
          id: cartDrop.id,
          name: cartDrop.name
        },
        items,
        totalValue,
        meta: {
          pagination: {
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            itemsPerPage: limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching cart drop items:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch cart drop items"
      }
    }, { status: 500 });
  }
}

export async function POST(
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
          message: "You must be logged in to add items to a cart drop"
        }
      }, { status: 401 });
    }

    // Verify cart drop exists and check ownership
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
          message: "You don't have permission to add items to this cart drop"
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = addItemSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid item data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { productId, quantity, note } = validatedData.data;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, inStock: true }
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

    // Check if product is in stock
    if (!product.inStock) {
      return NextResponse.json({
        success: false,
        error: {
          code: "UNAVAILABLE",
          message: "Product is out of stock"
        }
      }, { status: 400 });
    }

    // Check if item already exists in cart drop
    const existingItem = await prisma.cartDropItem.findFirst({
      where: {
        cartDropId: id,
        productId
      }
    });

    if (existingItem) {
      return NextResponse.json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "This product is already in the cart drop",
          data: { existingItemId: existingItem.id }
        }
      }, { status: 409 });
    }

    // Add item to cart drop in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the item
      const item = await tx.cartDropItem.create({
        data: {
          cartDropId: id,
          productId,
          quantity,
          note: note || null,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true
            }
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "ADD_CART_DROP_ITEM",
          entityType: "CART_DROP_ITEM",
          entityId: item.id,
          details: `Added "${product.name}" (quantity: ${quantity}) to cart drop`
        }
      });

      return item;
    });

    // Return success response with created item
    return NextResponse.json({
      success: true,
      data: result,
      message: "Item added to cart drop successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding item to cart drop:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to add item to cart drop"
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
          message: "You must be logged in to remove items from a cart drop"
        }
      }, { status: 401 });
    }

    // Verify cart drop exists
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
          message: "You don't have permission to remove items from this cart drop"
        }
      }, { status: 403 });
    }

    // Parse and validate request body to get item ID
    const body = await req.json();
    const validatedData = deleteItemSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "INVALID_DATA",
          message: "Invalid item data",
          details: validatedData.error.format()
        }
      }, { status: 400 });
    }

    const { itemId } = validatedData.data;

    // Verify item exists and belongs to this cart drop
    const item = await prisma.cartDropItem.findFirst({
      where: {
        id: itemId,
        cartDropId: id
      },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Item not found in this cart drop"
        }
      }, { status: 404 });
    }

    // Delete item in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the item
      await tx.cartDropItem.delete({
        where: { id: itemId }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REMOVE_CART_DROP_ITEM",
          entityType: "CART_DROP_ITEM",
          entityId: itemId,
          details: `Removed "${item.product.name}" from cart drop`
        }
      });
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Item removed from cart drop successfully"
    });
  } catch (error) {
    console.error("Error removing item from cart drop:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to remove item from cart drop"
      }
    }, { status: 500 });
  }
} 