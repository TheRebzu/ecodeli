"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ShoppingCart,
  MapPin,
  Clock,
  Settings,
  TrendingUp,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useCartDrop } from "@/features/merchant/hooks/use-cart-drop";

export function CartDropOverview() {
  const t = useTranslations("merchant.cartDrop");
  const { config, isLoading, updateConfig } = useCartDrop();

  const handleToggleService = async (enabled: boolean) => {
    try {
      await updateConfig({ isActive: enabled });
    } catch (error) {
      console.error("Error updating cart drop config:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/merchant/cart-drop/settings">
              <Settings className="mr-2 h-4 w-4" />
              {t("settings")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/merchant/cart-drop/zones">
              <MapPin className="mr-2 h-4 w-4" />
              {t("zones")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            {t("serviceStatus")}
          </CardTitle>
          <CardDescription>{t("serviceStatusDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">{t("cartDropService")}</h3>
              <p className="text-sm text-muted-foreground">
                {config?.isActive ? t("serviceActive") : t("serviceInactive")}
              </p>
            </div>
            <Switch
              checked={config?.isActive || false}
              onCheckedChange={handleToggleService}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalOrders")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config?.stats?.totalOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.activeZones")}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config?.deliveryZones?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.deliveryZones")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.timeSlots")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config?.timeSlots?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.availableSlots")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.revenue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{config?.stats?.revenue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.fromCartDrop")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delivery Zones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              {t("deliveryZones")}
            </CardTitle>
            <CardDescription>{t("deliveryZonesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {config?.deliveryZones && config.deliveryZones.length > 0 ? (
              <div className="space-y-2">
                {config.deliveryZones
                  .slice(0, 3)
                  .map((zone: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{zone.postalCode}</div>
                        <div className="text-sm text-muted-foreground">
                          €{zone.deliveryFee} {t("deliveryFee")}
                        </div>
                      </div>
                      <Badge variant="outline">{t("active")}</Badge>
                    </div>
                  ))}
                {config.deliveryZones.length > 3 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/merchant/cart-drop/zones">
                        {t("viewAllZones")}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  {t("noZonesConfigured")}
                </p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/merchant/cart-drop/zones">
                    {t("configureZones")}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              {t("timeSlots")}
            </CardTitle>
            <CardDescription>{t("timeSlotsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {config?.timeSlots && config.timeSlots.length > 0 ? (
              <div className="space-y-2">
                {config.timeSlots
                  .slice(0, 3)
                  .map((slot: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{slot.day}</div>
                        <div className="text-sm text-muted-foreground">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                      <Badge variant="outline">{t("active")}</Badge>
                    </div>
                  ))}
                {config.timeSlots.length > 3 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/merchant/cart-drop/schedules">
                        {t("viewAllSlots")}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  {t("noSlotsConfigured")}
                </p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/merchant/cart-drop/schedules">
                    {t("configureSlots")}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
          <CardDescription>{t("quickActionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" asChild>
              <Link href="/merchant/cart-drop/settings">
                <Settings className="mr-2 h-4 w-4" />
                {t("configureService")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/merchant/cart-drop/zones">
                <MapPin className="mr-2 h-4 w-4" />
                {t("manageZones")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/merchant/cart-drop/schedules">
                <Clock className="mr-2 h-4 w-4" />
                {t("manageSchedules")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
