import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export interface ActivityLogData {
  id: string;
  userId: string;
  userName: string;
  userRole: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';
  action: string;
  category: 'AUTH' | 'PAYMENT' | 'DELIVERY' | 'SERVICE' | 'ADMIN' | 'SECURITY';
  description: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  metadata?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  success: boolean;
}

export interface ActivityStats {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  securityAlerts: number;
  activeUsers: number;
  topActions: Array<{ action: string; count: number }>;
}

export interface ActivityFilter {
  userId?: string;
  userRole?: string;
  category?: string;
  severity?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

export class UserActivityService {
  constructor(private db: PrismaClient) {}

  /**
   * Log user activity
   */
  async logActivity(data: {
    userId: string;
    action: string;
    category: 'AUTH' | 'PAYMENT' | 'DELIVERY' | 'SERVICE' | 'ADMIN' | 'SECURITY';
    description: string;
    ipAddress: string;
    userAgent: string;
    location?: string;
    metadata?: Record<string, any>;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    success?: boolean;
  }) {
    try {
      // Get user information
      const user = await this.db.user.findUnique({
        where: { id: data.userId },
        select: {
          id: true,
          name: true,
          role: true,
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create activity log entry
      const activityLog = await this.db.userActivityLog.create({
        data: {
          userId: data.userId,
          userName: user.name || 'Unknown User',
          userRole: user.role,
          action: data.action,
          category: data.category,
          description: data.description,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          location: data.location,
          metadata: data.metadata,
          severity: data.severity || 'LOW',
          success: data.success ?? true,
          timestamp: new Date(),
        }
      });

      return activityLog;
    } catch (error) {
      console.error('Error logging user activity:', error);
      throw error;
    }
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters: ActivityFilter): Promise<{
    logs: ActivityLogData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      
      // Build where clause
      const whereClause: any = {};

      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      if (filters.userRole) {
        whereClause.userRole = filters.userRole;
      }

      if (filters.category) {
        whereClause.category = filters.category;
      }

      if (filters.severity) {
        whereClause.severity = filters.severity;
      }

      if (filters.success !== undefined) {
        whereClause.success = filters.success;
      }

      if (filters.search) {
        whereClause.OR = [
          { userName: { contains: filters.search, mode: "insensitive" } },
          { action: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      if (filters.dateFrom || filters.dateTo) {
        whereClause.timestamp = {};
        if (filters.dateFrom) {
          whereClause.timestamp.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereClause.timestamp.lte = filters.dateTo;
        }
      }

      // Get total count
      const total = await this.db.userActivityLog.count({ where: whereClause });

      // Get logs with pagination
      const logs = await this.db.userActivityLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        logs: logs.map(log => ({
          id: log.id,
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole as 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN',
          action: log.action,
          category: log.category as 'AUTH' | 'PAYMENT' | 'DELIVERY' | 'SERVICE' | 'ADMIN' | 'SECURITY',
          description: log.description,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          location: log.location || undefined,
          metadata: log.metadata ? JSON.parse(log.metadata as string) : undefined,
          severity: log.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          timestamp: log.timestamp,
          success: log.success,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ActivityStats> {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get total actions
      const totalActions = await this.db.userActivityLog.count({
        where: {
          timestamp: { gte: startDate }
        }
      });

      // Get successful actions
      const successfulActions = await this.db.userActivityLog.count({
        where: {
          timestamp: { gte: startDate },
          success: true
        }
      });

      // Get failed actions
      const failedActions = totalActions - successfulActions;

      // Get security alerts
      const securityAlerts = await this.db.userActivityLog.count({
        where: {
          timestamp: { gte: startDate },
          OR: [
            { category: 'SECURITY' },
            { severity: 'HIGH' },
            { severity: 'CRITICAL' }
          ]
        }
      });

      // Get active users
      const activeUsers = await this.db.userActivityLog.findMany({
        where: {
          timestamp: { gte: startDate }
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      });

      // Get top actions
      const topActionsData = await this.db.userActivityLog.groupBy({
        by: ['action'],
        where: {
          timestamp: { gte: startDate }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      const topActions = topActionsData.map(item => ({
        action: item.action,
        count: item._count.id
      }));

      return {
        totalActions,
        successfulActions,
        failedActions,
        securityAlerts,
        activeUsers: activeUsers.length,
        topActions
      };
    } catch (error) {
      console.error('Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Export activity logs
   */
  async exportActivityLogs(
    filters: ActivityFilter,
    format: 'CSV' | 'JSON' | 'XLSX' = 'CSV'
  ): Promise<{
    data: string;
    filename: string;
    mimeType: string;
  }> {
    try {
      const { logs } = await this.getActivityLogs({
        ...filters,
        limit: 10000, // Export limit
      });

      let data: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'CSV':
          data = this.convertToCSV(logs);
          filename = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'JSON':
          data = JSON.stringify(logs, null, 2);
          filename = `activity_logs_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'XLSX':
          // For now, return CSV format for XLSX
          data = this.convertToCSV(logs);
          filename = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        default:
          data = this.convertToCSV(logs);
          filename = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
      }

      return { data, filename, mimeType };
    } catch (error) {
      console.error('Error exporting activity logs:', error);
      throw error;
    }
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: ActivityLogData[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID',
      'User ID',
      'User Name',
      'User Role',
      'Action',
      'Category',
      'Description',
      'IP Address',
      'User Agent',
      'Location',
      'Severity',
      'Timestamp',
      'Success',
      'Metadata'
    ];

    const rows = logs.map(log => [
      log.id,
      log.userId,
      log.userName,
      log.userRole,
      log.action,
      log.category,
      log.description,
      log.ipAddress,
      log.userAgent,
      log.location || '',
      log.severity,
      log.timestamp.toISOString(),
      log.success ? 'Yes' : 'No',
      log.metadata ? JSON.stringify(log.metadata) : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}