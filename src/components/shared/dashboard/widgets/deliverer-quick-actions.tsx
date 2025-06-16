"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Package,
  Route,
  Calendar,
  Bell,
  Map,
  Settings,
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  Navigation} from "lucide-react";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type DelivererQuickActionsProps = {
  isAvailable?: boolean;
  hasActiveDeliveries?: boolean;
  pendingNotifications?: number;
};

export function DelivererQuickActions({
  isAvailable = false,
  hasActiveDeliveries = false,
  pendingNotifications = 0}: DelivererQuickActionsProps) {
  const t = useTranslations("dashboard.deliverer");
  const router = useRouter();

  // Actions primaires (toujours visibles)
  const primaryActions = [
    {
      id: "toggle-availability",
      label: isAvailable ? t("actions.goOffline") : t("actions.goOnline"),
      icon: isAvailable ? (
        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
      ) : (
        <Clock className="h-4 w-4 mr-2 text-gray-500" />
      ),
      onClick: () => {
        // Logique pour basculer la disponibilité
        console.log("Toggle availability");
      },
      variant: isAvailable ? "outline" : ("default" as ButtonVariant),
      priority: "high",
      className: isAvailable
        ? "border-green-300 bg-green-50 hover:bg-green-100"
        : ""},
    {
      id: "active-deliveries",
      label: t("actions.activeDeliveries"),
      icon: <Package className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/deliveries/active"),
      variant: hasActiveDeliveries ? "default" : ("outline" as ButtonVariant),
      priority: "high",
      badge: hasActiveDeliveries ? "!" : undefined}];

  // Actions secondaires
  const secondaryActions = [
    {
      id: "find-deliveries",
      label: t("actions.findDeliveries"),
      icon: <Navigation className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/announcements"),
      variant: "outline" as ButtonVariant,
      priority: "medium"},
    {
      id: "create-route",
      label: t("actions.createRoute"),
      icon: <Route className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/my-routes/create"),
      variant: "outline" as ButtonVariant,
      priority: "medium"},
    {
      id: "manage-schedule",
      label: t("actions.manageSchedule"),
      icon: <Calendar className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/schedule"),
      variant: "outline" as ButtonVariant,
      priority: "medium"},
    {
      id: "view-map",
      label: t("actions.viewMap"),
      icon: <Map className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/map"),
      variant: "outline" as ButtonVariant,
      priority: "medium"},
    {
      id: "wallet",
      label: t("actions.viewWallet"),
      icon: <Wallet className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/wallet"),
      variant: "outline" as ButtonVariant,
      priority: "low"},
    {
      id: "notifications",
      label: t("actions.notifications"),
      icon:
        pendingNotifications > 0 ? (
          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        ),
      onClick: () => router.push("/deliverer/notifications"),
      variant: "outline" as ButtonVariant,
      priority: "low",
      badge:
        pendingNotifications > 0 ? pendingNotifications.toString() : undefined},
    {
      id: "profile-settings",
      label: t("actions.profileSettings"),
      icon: <Settings className="h-4 w-4 mr-2" />,
      onClick: () => router.push("/deliverer/profile"),
      variant: "outline" as ButtonVariant,
      priority: "low"}];

  const allActions = [...primaryActions, ...secondaryActions];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {t("quickActions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Actions primaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {primaryActions.map((action) => (
              <div key={action.id} className="relative">
                <Button
                  variant={action.variant}
                  size="sm"
                  className={`w-full justify-start ${action.className || ""}`}
                  onClick={action.onClick}
                >
                  {action.icon}
                  {action.label}
                </Button>
                {action.badge && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Séparateur */}
          <div className="border-t pt-4">
            {/* Actions secondaires */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {secondaryActions.map((action) => (
                <div key={action.id} className="relative">
                  <Button
                    variant={action.variant}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={action.onClick}
                  >
                    {action.icon}
                    <span className="truncate">{action.label}</span>
                  </Button>
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isAvailable ? "bg-green-500" : "bg-gray-400"}`}
              />
              <span className="font-medium">
                {isAvailable ? t("status.online") : t("status.offline")}
              </span>
            </div>
            <span className="text-muted-foreground">
              {hasActiveDeliveries ? t("status.busy") : t("status.available")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
