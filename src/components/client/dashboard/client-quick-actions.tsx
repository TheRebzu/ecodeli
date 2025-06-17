"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, Calendar, MapPin, CreditCard, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ClientQuickActions() {
  const router = useRouter();
  const t = useTranslations("dashboard.client.quickActions");

  const quickActions = [
    {
      title: t("createAnnouncement"),
      description: t("createAnnouncementDesc"),
      icon: Plus,
      href: "/client/announcements/create",
      color: "bg-blue-500"
    },
    {
      title: t("viewDeliveries"),
      description: t("viewDeliveriesDesc"),
      icon: Package,
      href: "/client/deliveries",
      color: "bg-green-500"
    },
    {
      title: t("bookService"),
      description: t("bookServiceDesc"),
      icon: Calendar,
      href: "/client/services",
      color: "bg-purple-500"
    },
    {
      title: t("manageStorage"),
      description: t("manageStorageDesc"),
      icon: MapPin,
      href: "/client/storage",
      color: "bg-orange-500"
    },
    {
      title: t("payments"),
      description: t("paymentsDesc"),
      icon: CreditCard,
      href: "/client/payments",
      color: "bg-indigo-500"
    },
    {
      title: t("notifications"),
      description: t("notificationsDesc"),
      icon: Bell,
      href: "/client/notifications",
      color: "bg-red-500"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-muted/50"
                onClick={() => router.push(action.href)}
              >
                <div className="flex items-center space-x-2 w-full">
                  <div className={`p-2 rounded-md ${action.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
