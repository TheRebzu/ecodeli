"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Package,
  Box,
  CalendarClock,
  Headphones,
  PlusCircle,
  Search,
  FileText,
  Settings,
} from "lucide-react";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export function QuickActions() {
  const t = useTranslations("dashboard.client");
  const router = useRouter();

  // Définition des actions rapides
  const actions = [
    {
      id: "create-announcement",
      label: t("actions.createAnnouncement"),
      icon: <PlusCircle className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/announcements/create"),
      variant: "default" as ButtonVariant,
    },
    {
      id: "search-services",
      label: t("actions.searchServices"),
      icon: <Search className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/services"),
      variant: "outline" as ButtonVariant,
    },
    {
      id: "track-deliveries",
      label: t("actions.trackDeliveries"),
      icon: <Package className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/deliveries"),
      variant: "outline" as ButtonVariant,
    },
    {
      id: "book-storage",
      label: t("actions.bookStorage"),
      icon: <Box className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/storage"),
      variant: "outline" as ButtonVariant,
    },
    {
      id: "schedule-service",
      label: t("actions.scheduleService"),
      icon: <CalendarClock className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/services/book"),
      variant: "outline" as ButtonVariant,
    },
    {
      id: "view-invoices",
      label: t("actions.viewInvoices"),
      icon: <FileText className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/invoices"),
      variant: "outline" as ButtonVariant,
    },
    {
      id: "update-profile",
      label: t("actions.updateProfile"),
      icon: <Settings className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/client/profile"),
      variant: "outline" as ButtonVariant,
    },
    {
      id: "contact-support",
      label: t("actions.contactSupport"),
      icon: <Headphones className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/contact"),
      variant: "outline" as ButtonVariant,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          {t("quickActions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              size="sm"
              className="w-full justify-start"
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
