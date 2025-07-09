import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/utils';
import { oneSignalService } from '@/features/notifications/services/onesignal.service';
import { z } from 'zod';

const notificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['DELIVERY_UPDATE', 'PAYMENT', 'BOOKING', 'SUBSCRIPTION', 'MATCHING', 'DOCUMENT_VALIDATION']),
  data: z.record(z.any()).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
});

const bulkNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.any()).optional(),
});

// POST - Envoyer une notification push
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est un admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can send push notifications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = notificationSchema.parse(body);

    const success = await oneSignalService.sendNotification({
      userId: validatedData.userId,
      title: validatedData.title,
      message: validatedData.message,
      type: validatedData.type,
      data: validatedData.data,
      priority: validatedData.priority,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Envoyer des notifications en lot
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est un admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can send bulk notifications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = bulkNotificationSchema.parse(body);

    const results = await oneSignalService.sendBulkNotification(
      validatedData.userIds,
      validatedData.title,
      validatedData.message,
      validatedData.data
    );

    const successCount = results.filter(Boolean).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Bulk notification sent: ${successCount} successful, ${failureCount} failed`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error sending bulk notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get notification history (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admin users can view notification history' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');

    // In a real implementation, you would store notification history in the database
    // For now, we'll return a mock response
    const mockNotifications = [
      {
        id: '1',
        userId: 'user1',
        title: 'Test notification',
        message: 'This is a test notification',
        type: 'GENERAL',
        sentAt: new Date().toISOString(),
        status: 'sent',
      },
    ];

    return NextResponse.json({
      notifications: mockNotifications,
      total: mockNotifications.length,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 