import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  campaignId: z.string().optional(),
  channelType: z.string().optional(),
  status: z.enum(["active", "completed", "all"]).default("all"),
});

// GET: Analyze marketing campaign performance
export async function GET(req: NextRequest) {
  try {
    // Authenticate user and verify admin permission
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      period: searchParams.get("period") || "month",
      campaignId: searchParams.get("campaignId"),
      channelType: searchParams.get("channelType"),
      status: searchParams.get("status") || "all",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, campaignId, channelType, status } = validatedParams.data;

    // Determine date range based on period
    const now = new Date();
    const dateFrom = new Date();
    
    switch (period) {
      case "week":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "month":
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case "year":
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Build campaign filter
    const campaignFilter: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: now,
      },
    };

    if (campaignId) {
      campaignFilter.id = campaignId;
    }

    if (channelType) {
      campaignFilter.channelType = channelType;
    }

    if (status !== "all") {
      const isActive = status === "active";
      campaignFilter.isActive = isActive;
    }

    // Get campaigns
    const campaigns = await prisma.marketingCampaign.findMany({
      where: campaignFilter,
      include: {
        promotions: true,
        targetAudience: true,
      },
    });

    // Get user acquisitions through campaigns
    const userAcquisitions = await prisma.userAcquisition.findMany({
      where: {
        campaignId: {
          in: campaigns.map(campaign => campaign.id),
        },
        createdAt: {
          gte: dateFrom,
          lte: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            orders: {
              where: {
                createdAt: {
                  gte: dateFrom,
                  lte: now,
                },
                status: "COMPLETED",
              },
              select: {
                id: true,
                total: true,
              },
            },
          },
        },
      },
    });

    // Analyze campaign performance
    const campaignPerformance = campaigns.map(campaign => {
      // Filter acquisitions for this campaign
      const campaignAcquisitions = userAcquisitions.filter(
        acquisition => acquisition.campaignId === campaign.id
      );
      
      // Calculate acquisitions metrics
      const totalAcquisitions = campaignAcquisitions.length;
      
      // Calculate conversions (users who made at least one order)
      const conversions = campaignAcquisitions.filter(
        acquisition => acquisition.user.orders.length > 0
      ).length;
      
      // Calculate conversion rate
      const conversionRate = totalAcquisitions > 0 
        ? (conversions / totalAcquisitions) * 100 
        : 0;
      
      // Calculate revenue from converted users
      const revenue = campaignAcquisitions.reduce((sum, acquisition) => {
        const userRevenue = acquisition.user.orders.reduce(
          (orderSum, order) => orderSum + order.total,
          0
        );
        return sum + userRevenue;
      }, 0);
      
      // Calculate cost per acquisition (CPA)
      const cpa = totalAcquisitions > 0 
        ? campaign.budget / totalAcquisitions 
        : 0;
      
      // Calculate return on investment (ROI)
      const roi = campaign.budget > 0 
        ? ((revenue - campaign.budget) / campaign.budget) * 100 
        : 0;
      
      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        channelType: campaign.channelType,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        isActive: campaign.isActive,
        budget: campaign.budget,
        metrics: {
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          totalAcquisitions,
          conversions,
          conversionRate,
          revenue,
          cpa,
          roi,
          ctr: campaign.impressions > 0 
            ? (campaign.clicks / campaign.impressions) * 100 
            : 0,
        },
        targetAudience: campaign.targetAudience,
        promotions: campaign.promotions,
      };
    });

    // Sort campaigns by ROI
    const sortedCampaigns = campaignPerformance.sort((a, b) => 
      b.metrics.roi - a.metrics.roi
    );

    // Calculate channel performance
    const channelPerformance: Record<string, {
      campaigns: number;
      totalBudget: number;
      totalAcquisitions: number;
      totalConversions: number;
      totalRevenue: number;
      averageRoi: number;
    }> = {};

    sortedCampaigns.forEach(campaign => {
      const channel = campaign.channelType || "Unknown";
      
      if (!channelPerformance[channel]) {
        channelPerformance[channel] = {
          campaigns: 0,
          totalBudget: 0,
          totalAcquisitions: 0,
          totalConversions: 0,
          totalRevenue: 0,
          averageRoi: 0,
        };
      }
      
      channelPerformance[channel].campaigns += 1;
      channelPerformance[channel].totalBudget += campaign.budget;
      channelPerformance[channel].totalAcquisitions += campaign.metrics.totalAcquisitions;
      channelPerformance[channel].totalConversions += campaign.metrics.conversions;
      channelPerformance[channel].totalRevenue += campaign.metrics.revenue;
    });

    // Calculate average ROI for each channel
    Object.keys(channelPerformance).forEach(channel => {
      const { totalBudget, totalRevenue } = channelPerformance[channel];
      channelPerformance[channel].averageRoi = totalBudget > 0 
        ? ((totalRevenue - totalBudget) / totalBudget) * 100 
        : 0;
    });

    // Sort channels by average ROI
    const sortedChannels = Object.entries(channelPerformance)
      .sort(([, a], [, b]) => b.averageRoi - a.averageRoi)
      .map(([channel, metrics]) => ({
        channel,
        ...metrics,
        averageConversionRate: metrics.totalAcquisitions > 0 
          ? (metrics.totalConversions / metrics.totalAcquisitions) * 100 
          : 0,
      }));

    // Calculate overall metrics
    const totalBudget = sortedCampaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
    const totalAcquisitions = sortedCampaigns.reduce(
      (sum, campaign) => sum + campaign.metrics.totalAcquisitions, 
      0
    );
    const totalConversions = sortedCampaigns.reduce(
      (sum, campaign) => sum + campaign.metrics.conversions, 
      0
    );
    const totalRevenue = sortedCampaigns.reduce(
      (sum, campaign) => sum + campaign.metrics.revenue, 
      0
    );
    const overallRoi = totalBudget > 0 
      ? ((totalRevenue - totalBudget) / totalBudget) * 100 
      : 0;

    return NextResponse.json({
      data: {
        campaigns: sortedCampaigns,
        channelPerformance: sortedChannels,
        summary: {
          totalCampaigns: campaigns.length,
          activeCampaigns: campaigns.filter(campaign => campaign.isActive).length,
          totalBudget,
          totalAcquisitions,
          totalConversions,
          averageConversionRate: totalAcquisitions > 0 
            ? (totalConversions / totalAcquisitions) * 100 
            : 0,
          totalRevenue,
          overallRoi,
        },
      },
      meta: {
        period,
        campaignId,
        channelType,
        status,
        dateRange: {
          from: dateFrom,
          to: now,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error analyzing marketing performance:", error);
    return NextResponse.json(
      { error: "Failed to analyze marketing performance" },
      { status: 500 }
    );
  }
} 