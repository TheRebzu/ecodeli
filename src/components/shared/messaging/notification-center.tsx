"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  Clock,
  FileText,
  Trash,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr, enGB } from "date-fns/locale";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils/common";

interface NotificationCenterProps {
  locale: string;
}

// Define notification type
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
}

export function NotificationCenter({ locale }: NotificationCenterProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [itemsPerPage] = useState(10);

  const t = useTranslations();
  const tNotif = useTranslations("notifications");
  const router = useRouter();
  const { toast } = useToast();

  // Get notifications with pagination
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = api.notification.getNotifications.useQuery({
    page: currentPage,
    limit: itemsPerPage,
  });

  // Get unread notifications
  const {
    data: unreadNotifications,
    isLoading: isLoadingUnread,
    refetch: refetchUnread,
  } = api.notification.getUnreadNotifications.useQuery(undefined, {
    enabled: activeTab === "unread",
  });

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
        title: tNotif("allMarkedAsRead"),
      });
    },
  });

  const deleteNotificationMutation =
    api.notification.deleteNotification.useMutation({
      onSuccess: () => {
        refetch();
        refetchUnread();
        toast({
          title: tNotif("notificationDeleted"),
        });
      },
    });

  const deleteAllNotificationsMutation =
    api.notification.deleteAllNotifications.useMutation({
      onSuccess: () => {
        refetch();
        refetchUnread();
        toast({
          title: tNotif("allNotificationsDeleted"),
        });
      },
    });

  const handleTabChange = (value: string) => {
    setActiveTab(value as "all" | "unread");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleNotificationClick = async (
    id: string,
    read: boolean,
    link: string | null,
  ) => {
    if (!read) {
      await markAsReadMutation.mutateAsync({ id });
    }

    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotificationMutation.mutateAsync({ id });
  };

  const handleDeleteAllNotifications = async () => {
    await deleteAllNotificationsMutation.mutateAsync();
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("DOCUMENT")) {
      if (type.includes("APPROVED")) {
        return <Check className="h-5 w-5 text-green-500" />;
      } else if (type.includes("REJECTED")) {
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      }
      return <FileText className="h-5 w-5 text-primary" />;
    } else if (type.includes("VERIFICATION")) {
      if (type.includes("APPROVED")) {
        return <Check className="h-5 w-5 text-green-500" />;
      } else if (type.includes("REJECTED")) {
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      } else {
        return <Clock className="h-5 w-5 text-amber-500" />;
      }
    }

    return <Bell className="h-5 w-5 text-primary" />;
  };

  const formatDate = (date: Date) => {
    const localeObj = locale === "fr" ? fr : enGB;
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: localeObj,
    });
  };

  const renderNotificationList = (
    notifications: Notification[] | undefined,
    isLoading: boolean,
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border rounded-md">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!notifications || notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            {tNotif("noNotifications")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tNotif("notificationsWillAppearHere")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "flex items-start gap-4 p-4 border rounded-md cursor-pointer transition-colors",
              !notification.read && "bg-muted/30 hover:bg-muted/50",
              notification.read && "hover:bg-muted/10",
            )}
            onClick={() =>
              handleNotificationClick(
                notification.id,
                notification.read,
                notification.link,
              )
            }
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {getNotificationIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h4
                    className={cn(
                      "font-medium",
                      !notification.read && "font-semibold",
                    )}
                  >
                    {notification.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDeleteNotification(e, notification.id)}
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">{tNotif("delete")}</span>
                </Button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDate(notification.createdAt)}
                </span>
                {!notification.read ? (
                  <Badge variant="secondary" className="text-xs">
                    {tNotif("unread")}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Calculate total pages
  const totalPages = notificationsData
    ? Math.ceil(notificationsData.total / itemsPerPage)
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{tNotif("title")}</CardTitle>
            <CardDescription>{tNotif("description")}</CardDescription>
          </div>
          <div className="flex gap-2">
            {(activeTab === "unread" &&
              unreadNotifications &&
              unreadNotifications.length > 0) ||
            (activeTab === "all" &&
              notificationsData &&
              notificationsData.total > 0) ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                >
                  {tNotif("markAllAsRead")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAllNotifications}
                  disabled={deleteAllNotificationsMutation.isPending}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  {tNotif("deleteAll")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="all">{tNotif("allNotifications")}</TabsTrigger>
            <TabsTrigger value="unread">
              {tNotif("unreadOnly")}
              {unreadNotifications && unreadNotifications.length > 0 ? (
                <Badge variant="secondary" className="ml-2">
                  {unreadNotifications.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderNotificationList(
              notificationsData?.notifications,
              isLoading,
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="mt-0">
            {renderNotificationList(unreadNotifications, isLoadingUnread)}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          {t("common.back")}
        </Button>
      </CardFooter>
    </Card>
  );
}
