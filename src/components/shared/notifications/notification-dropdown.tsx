'use client';

import { useState } from 'react';
import { Bell, Check, ChevronRight, Clock, FileText, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Notification } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenuTriggerProps } from '@radix-ui/react-dropdown-menu';

interface NotificationDropdownProps extends DropdownMenuTriggerProps {
  locale: string;
}

export function NotificationDropdown({ locale, ...props }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const tNotif = useTranslations('notifications');
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  // Get all notifications
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = api.notification.getNotifications.useQuery(
    { page: 1, limit: 10 },
    { enabled: !!session?.user.id, refetchInterval: 60000 } // Refetch every minute
  );

  // Get unread count
  const { data: unreadCount, refetch: refetchUnread } = api.notification.getUnreadCount.useQuery(
    undefined,
    { enabled: !!session?.user.id, refetchInterval: 30000 } // Refetch every 30 seconds
  );

  // Mutations
  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnread();
    },
  });

  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnread();
      toast({
        title: tNotif('allMarkedAsRead'),
      });
    },
  });

  const deleteNotificationMutation = api.notification.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnread();
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsReadMutation.mutateAsync({ id: notification.id });
    }

    // Navigate to the link if provided
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotificationMutation.mutateAsync({ id });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('DOCUMENT')) {
      return <FileText className="h-4 w-4 text-primary" />;
    } else if (type.includes('VERIFICATION')) {
      if (type.includes('APPROVED')) {
        return <Check className="h-4 w-4 text-green-500" />;
      } else if (type.includes('REJECTED')) {
        return <Trash className="h-4 w-4 text-red-500" />;
      } else {
        return <Clock className="h-4 w-4 text-amber-500" />;
      }
    }

    return <Bell className="h-4 w-4 text-primary" />;
  };

  const formatDate = (date: Date) => {
    const localeObj = locale === 'fr' ? fr : enGB;
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeObj });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild {...props}>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-primary text-[10px] text-white font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-medium">{tNotif('title')}</h3>
          {unreadCount && unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isLoading}
            >
              {tNotif('markAllAsRead')}
            </Button>
          ) : null}
        </div>

        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notificationsData?.notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
              <Bell className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{tNotif('empty')}</p>
            </div>
          ) : (
            <div>
              {notificationsData?.notifications.map(notification => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer',
                    !notification.read && 'bg-muted/30'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p
                        className={cn('text-sm font-medium', !notification.read && 'font-semibold')}
                      >
                        {notification.title}
                      </p>
                      <button
                        onClick={e => handleDeleteNotification(e, notification.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center justify-center p-2 cursor-pointer"
          onClick={() => {
            setOpen(false);
            router.push(`/${locale}/${session?.user.role.toLowerCase()}/notifications`);
          }}
        >
          <span className="text-sm text-primary">{tNotif('viewAll')}</span>
          <ChevronRight className="h-4 w-4 text-primary ml-1" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
