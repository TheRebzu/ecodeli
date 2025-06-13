"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { formatDistance } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle,
  XCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  data?: any;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
};

export function DocumentNotifications() {
  const t = useTranslations("documents");
  const { t: tCommon } = useTranslations("common");
  const router = useRouter();
  const locale = "fr"; // Use a hook or context value for this in a real app

  const {
    data: notifications,
    isLoading,
    refetch,
  } = api.notification.getNotifications.useQuery({
    limit: 10,
    types: ["DOCUMENT_SUBMITTED"],
  });

  // Mark notification as read
  const { mutate: markAsRead } = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      // Refetch notifications after marking one as read
      refetch();
    },
  });

  // Navigate to document verification page and mark notification as read
  const handleViewDocument = (notification: Notification) => {
    if (notification.link && !notification.read) {
      markAsRead({ id: notification.id });
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  // Format the creation time
  const formatCreationTime = (date: Date) => {
    return formatDistance(new Date(date), new Date(), {
      addSuffix: true,
      locale: locale === "fr" ? fr : enUS,
    });
  };

  // Parse notification data
  const parseData = (notification: Notification) => {
    if (!notification.data) return null;

    try {
      return typeof notification.data === "string"
        ? JSON.parse(notification.data)
        : notification.data;
    } catch (error) {
      console.error("Error parsing notification data:", error);
      return null;
    }
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            {t("notifications.title")}
          </CardTitle>
          <CardDescription>{t("notifications.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="mb-4 flex items-start space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // If no notifications, show empty state
  if (!notifications || notifications.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            {t("notifications.title")}
          </CardTitle>
          <CardDescription>{t("notifications.description")}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Bell className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium">
            {t("notifications.noNotifications")}
          </h3>
          <p className="text-muted-foreground mt-1">
            {t("notifications.noNotificationsDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          {t("notifications.title")}
        </CardTitle>
        <CardDescription>{t("notifications.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map((notification) => {
          const data = parseData(notification);
          const documentType = data?.documentType;
          const documentTypeName = documentType
            ? t(`documentTypes.${documentType}`)
            : t("document");

          return (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg flex items-start ${notification.read ? "bg-gray-50" : "bg-blue-50 border-blue-200"}`}
            >
              <div className="mr-4 mt-1">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{notification.title}</h4>
                  {!notification.read && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      {tCommon("new")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {notification.message}
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span>{formatCreationTime(notification.createdAt)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => handleViewDocument(notification)}
              >
                <span className="sr-only">{t("notifications.view")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
      {notifications.length > 0 && (
        <CardFooter className="flex justify-center border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/documents/verifications")}
          >
            {t("notifications.viewAll")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
