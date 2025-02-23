import { prisma } from "@/lib/prisma"

export async function fetchDashboardData() {
  const [totalUsers, activeDeliveries, totalRevenue, pendingVerifications, usersByRole, recentActivities] =
    await Promise.all([
      prisma.user.count(),
      prisma.delivery.count({ where: { status: "IN_TRANSIT" } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.delivery.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { courier: { include: { user: true } }, customer: { include: { user: true } } },
      }),
    ])

  return {
    totalUsers,
    activeDeliveries,
    totalRevenue: totalRevenue._sum.amount || 0,
    pendingVerifications,
    usersByRole: usersByRole.map((role) => ({ role: role.role, count: role._count })),
    recentActivities: recentActivities.map((delivery) => ({
      description: `Delivery ${delivery.id} updated to ${delivery.status}`,
      timestamp: delivery.updatedAt.toISOString(),
    })),
  }
}

