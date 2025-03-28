import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { ForeignPurchaseStatus, Prisma, UserRole } from "@prisma/client";

// Schema for updating a foreign purchase request
const updateForeignPurchaseSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  sourceUrl: z.string().url().max(500).optional(),
  countryId: z.string().uuid().optional(),
  estimatedPrice: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  shippingPreference: z.enum(["STANDARD", "EXPRESS", "ECONOMY"]).optional(),
  customRequirements: z.string().max(500).nullish(),
  status: z.nativeEnum(ForeignPurchaseStatus).optional(),
  mediaIds: z.array(z.string().uuid()).optional(),
  assignedAgentId: z.string().uuid().nullish(),
  adminNotes: z.string().max(1000).nullish(),
  trackingNumber: z.string().max(100).nullish(),
  purchaseProofUrl: z.string().url().max(500).nullish(),
  actualPrice: z.number().positive().nullish(),
  estimatedDeliveryDate: z.string().nullish(), // ISO date string
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to view foreign purchase request details",
          },
        },
        { status: 401 }
      );
    }

    const foreignPurchaseId = params.id;

    // Fetch the foreign purchase request with related data
    const foreignPurchase = await prisma.foreignPurchaseRequest.findUnique({
      where: { id: foreignPurchaseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagUrl: true,
            currencyCode: true,
            currencySymbol: true,
            region: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            alt: true,
          },
        },
        statusUpdates: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
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
    });

    if (!foreignPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Foreign purchase request not found",
          },
        },
        { status: 404 }
      );
    }

    // Verify user has permission to view this request
    // Users can view their own requests
    // Admins can view all requests
    // Purchasing agents can view requests assigned to them
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    const isOwner = foreignPurchase.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;
    const isAssignedAgent = 
      userFromDb.role === UserRole.PURCHASING_AGENT && 
      foreignPurchase.assignedAgentId === userFromDb.id;

    if (!isOwner && !isAdmin && !isAssignedAgent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to view this foreign purchase request",
          },
        },
        { status: 403 }
      );
    }

    // Return the foreign purchase request
    return NextResponse.json({
      success: true,
      data: foreignPurchase,
    });
  } catch (error) {
    console.error("Error fetching foreign purchase request:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch foreign purchase request",
        },
      },
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update a foreign purchase request",
          },
        },
        { status: 401 }
      );
    }

    const foreignPurchaseId = params.id;

    // Fetch the current state of the foreign purchase request
    const currentPurchase = await prisma.foreignPurchaseRequest.findUnique({
      where: { id: foreignPurchaseId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Foreign purchase request not found",
          },
        },
        { status: 404 }
      );
    }

    // Verify permissions based on user role and request state
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    const isOwner = currentPurchase.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;
    const isAssignedAgent = 
      userFromDb.role === UserRole.PURCHASING_AGENT && 
      currentPurchase.assignedAgentId === userFromDb.id;

    // Parse and validate request body
    const body = await req.json();
    const validatedBody = updateForeignPurchaseSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid update data",
            details: validatedBody.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updateData = validatedBody.data;

    // Permission restrictions
    // 1. Regular users can update their own requests only if status is PENDING
    // 2. Admins can update any request and change status, assigned agent
    // 3. Assigned agents can update status and add notes/tracking info

    // Default update data
    const baseUpdateData: Prisma.ForeignPurchaseRequestUpdateInput = {};

    // Check if user can make these updates
    if (isOwner && !isAdmin) {
      // Owners can only update their requests if status is PENDING
      if (currentPurchase.status !== ForeignPurchaseStatus.PENDING) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only update pending foreign purchase requests",
            },
          },
          { status: 403 }
        );
      }

      // Owners cannot change status or assign agents
      if (updateData.status || updateData.assignedAgentId || updateData.adminNotes) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You don't have permission to change status, assign agents, or add admin notes",
            },
          },
          { status: 403 }
        );
      }

      // Apply basic updates for owners
      if (updateData.title) baseUpdateData.title = updateData.title;
      if (updateData.description) baseUpdateData.description = updateData.description;
      if (updateData.sourceUrl) baseUpdateData.sourceUrl = updateData.sourceUrl;
      if (updateData.countryId) baseUpdateData.countryId = updateData.countryId;
      if (updateData.estimatedPrice) baseUpdateData.estimatedPrice = updateData.estimatedPrice;
      if (updateData.quantity) baseUpdateData.quantity = updateData.quantity;
      if (updateData.shippingPreference) baseUpdateData.shippingPreference = updateData.shippingPreference;
      if (updateData.customRequirements !== undefined) baseUpdateData.customRequirements = updateData.customRequirements;
    } else if (isAssignedAgent && !isAdmin) {
      // Agents can update status and add specific fields for in-progress requests
      if (!["APPROVED", "IN_PROGRESS", "PURCHASED", "SHIPPED", "COMPLETED"].includes(currentPurchase.status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only update approved or in-progress foreign purchase requests",
            },
          },
          { status: 403 }
        );
      }

      // Agents can only update specific fields
      if (
        updateData.title || 
        updateData.description || 
        updateData.sourceUrl || 
        updateData.countryId || 
        updateData.assignedAgentId
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You don't have permission to change these fields",
            },
          },
          { status: 403 }
        );
      }

      // Apply agent-specific updates
      if (updateData.status) baseUpdateData.status = updateData.status;
      if (updateData.trackingNumber) baseUpdateData.trackingNumber = updateData.trackingNumber;
      if (updateData.purchaseProofUrl) baseUpdateData.purchaseProofUrl = updateData.purchaseProofUrl;
      if (updateData.actualPrice) baseUpdateData.actualPrice = updateData.actualPrice;
      if (updateData.estimatedDeliveryDate) baseUpdateData.estimatedDeliveryDate = updateData.estimatedDeliveryDate;
      if (updateData.adminNotes !== undefined) baseUpdateData.adminNotes = updateData.adminNotes;
    } else if (isAdmin) {
      // Admins can update any field
      Object.assign(baseUpdateData, updateData);
    } else {
      // Not authorized to update this request
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to update this foreign purchase request",
          },
        },
        { status: 403 }
      );
    }

    // If there's a status change, record it
    const hasStatusChange = updateData.status && updateData.status !== currentPurchase.status;

    // Verify country exists if changing
    if (updateData.countryId) {
      const country = await prisma.country.findUnique({
        where: { 
          id: updateData.countryId,
          supportsForeignPurchase: true,
          isActive: true
        },
      });

      if (!country) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "COUNTRY_NOT_FOUND",
              message: "Selected country does not exist or does not support foreign purchases",
            },
          },
          { status: 404 }
        );
      }
    }

    // Verify media exists if provided
    if (updateData.mediaIds && updateData.mediaIds.length > 0) {
      const mediaCount = await prisma.media.count({
        where: {
          id: { in: updateData.mediaIds },
          userId: isOwner ? session.user.id : currentPurchase.userId,
        },
      });

      if (mediaCount !== updateData.mediaIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_MEDIA",
              message: "One or more media items do not exist or do not belong to the user",
            },
          },
          { status: 400 }
        );
      }
    }

    // Verify agent exists if assigning
    if (updateData.assignedAgentId && updateData.assignedAgentId !== currentPurchase.assignedAgentId) {
      const agent = await prisma.user.findFirst({
        where: {
          id: updateData.assignedAgentId,
          role: UserRole.PURCHASING_AGENT,
        },
      });

      if (!agent) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "AGENT_NOT_FOUND",
              message: "Selected agent does not exist",
            },
          },
          { status: 404 }
        );
      }
    }

    // Update the foreign purchase request in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the basic purchase request data
      const updatedPurchase = await tx.foreignPurchaseRequest.update({
        where: { id: foreignPurchaseId },
        data: baseUpdateData,
      });

      // Update media associations if provided
      if (updateData.mediaIds) {
        // Remove existing media associations
        await tx.foreignPurchaseRequestMedia.deleteMany({
          where: { foreignPurchaseRequestId: foreignPurchaseId },
        });

        // Add new media associations
        if (updateData.mediaIds.length > 0) {
          await tx.foreignPurchaseRequestMedia.createMany({
            data: updateData.mediaIds.map((mediaId) => ({
              foreignPurchaseRequestId: foreignPurchaseId,
              mediaId,
            })),
          });
        }
      }

      // Create status update record if status has changed
      if (hasStatusChange) {
        await tx.foreignPurchaseStatusUpdate.create({
          data: {
            foreignPurchaseRequestId: foreignPurchaseId,
            status: updateData.status!,
            notes: updateData.adminNotes || `Status updated to ${updateData.status}`,
            userId: session.user.id,
          },
        });

        // Create notification for the user or agent depending on who made the change
        if (isAdmin || isAssignedAgent) {
          // Notify the user who created the request
          await tx.notification.create({
            data: {
              userId: currentPurchase.userId,
              title: "Foreign Purchase Request Updated",
              message: `Your foreign purchase request status has been updated to ${updateData.status}`,
              type: "FOREIGN_PURCHASE",
              referenceId: foreignPurchaseId,
            },
          });
        } else if (isOwner && updateData.status === ForeignPurchaseStatus.CANCELLED) {
          // If user cancels their request and an agent was assigned, notify the agent
          if (currentPurchase.assignedAgentId) {
            await tx.notification.create({
              data: {
                userId: currentPurchase.assignedAgentId,
                title: "Foreign Purchase Request Cancelled",
                message: `A foreign purchase request you were assigned to has been cancelled by the user`,
                type: "FOREIGN_PURCHASE",
                referenceId: foreignPurchaseId,
              },
            });
          }
        }

        // If a new agent is assigned, create notification for them
        if (
          updateData.assignedAgentId &&
          updateData.assignedAgentId !== currentPurchase.assignedAgentId
        ) {
          await tx.notification.create({
            data: {
              userId: updateData.assignedAgentId,
              title: "Foreign Purchase Request Assigned",
              message: `You have been assigned to handle a foreign purchase request`,
              type: "FOREIGN_PURCHASE",
              referenceId: foreignPurchaseId,
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "FOREIGN_PURCHASE",
          entityId: foreignPurchaseId,
          userId: session.user.id,
          details: {
            updatedFields: Object.keys(baseUpdateData),
            statusChange: hasStatusChange ? {
              from: currentPurchase.status,
              to: updateData.status
            } : undefined,
            agentChange: updateData.assignedAgentId !== currentPurchase.assignedAgentId ? {
              from: currentPurchase.assignedAgentId,
              to: updateData.assignedAgentId
            } : undefined
          }
        },
      });

      return updatedPurchase;
    });

    // Fetch the updated purchase request with related data
    const updatedRequest = await prisma.foreignPurchaseRequest.findUnique({
      where: { id: foreignPurchaseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagUrl: true,
            currencyCode: true,
            currencySymbol: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            alt: true,
          },
        },
        statusUpdates: {
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
          select: {
            status: true,
            notes: true,
            createdAt: true,
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
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating foreign purchase request:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to update foreign purchase request",
        },
      },
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to cancel a foreign purchase request",
          },
        },
        { status: 401 }
      );
    }

    const foreignPurchaseId = params.id;

    // Fetch the current state of the foreign purchase request
    const currentPurchase = await prisma.foreignPurchaseRequest.findUnique({
      where: { id: foreignPurchaseId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        assignedAgent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!currentPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Foreign purchase request not found",
          },
        },
        { status: 404 }
      );
    }

    // Verify permissions
    const userFromDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!userFromDb) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    const isOwner = currentPurchase.userId === userFromDb.id;
    const isAdmin = userFromDb.role === UserRole.ADMIN;

    // Only the owner or an admin can cancel a request
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to cancel this foreign purchase request",
          },
        },
        { status: 403 }
      );
    }

    // Check if request can be cancelled
    // Cannot cancel if already in PURCHASED, SHIPPED, COMPLETED, or CANCELLED states
    if (["PURCHASED", "SHIPPED", "COMPLETED", "CANCELLED"].includes(currentPurchase.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: `Cannot cancel request in ${currentPurchase.status} state`,
          },
        },
        { status: 400 }
      );
    }

    // Process the cancellation in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the request status to CANCELLED
      await tx.foreignPurchaseRequest.update({
        where: { id: foreignPurchaseId },
        data: {
          status: ForeignPurchaseStatus.CANCELLED,
        },
      });

      // Create status update record
      await tx.foreignPurchaseStatusUpdate.create({
        data: {
          foreignPurchaseRequestId: foreignPurchaseId,
          status: ForeignPurchaseStatus.CANCELLED,
          notes: `Request cancelled by ${isOwner ? "user" : "admin"}`,
          userId: session.user.id,
        },
      });

      // Create notifications
      if (isAdmin && currentPurchase.userId !== session.user.id) {
        // Notify the user if an admin cancelled their request
        await tx.notification.create({
          data: {
            userId: currentPurchase.userId,
            title: "Foreign Purchase Request Cancelled",
            message: `Your foreign purchase request has been cancelled by an administrator`,
            type: "FOREIGN_PURCHASE",
            referenceId: foreignPurchaseId,
          },
        });
      }

      // Notify assigned agent if there is one
      if (currentPurchase.assignedAgentId && currentPurchase.assignedAgentId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: currentPurchase.assignedAgentId,
            title: "Foreign Purchase Request Cancelled",
            message: `A foreign purchase request you were assigned to has been cancelled`,
            type: "FOREIGN_PURCHASE",
            referenceId: foreignPurchaseId,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "FOREIGN_PURCHASE",
          entityId: foreignPurchaseId,
          userId: session.user.id,
          details: {
            cancellationReason: "User request",
            previousStatus: currentPurchase.status
          }
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Foreign purchase request cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling foreign purchase request:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to cancel foreign purchase request",
        },
      },
      { status: 500 }
    );
  }
} 