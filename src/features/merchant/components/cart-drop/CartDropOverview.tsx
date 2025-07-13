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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ShoppingCart,
  MapPin,
  Clock,
  Settings,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function CartDropOverview() {
  const t = useTranslations("merchant.cartDrop");

  // Mock data - in real app, this would come from API
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const stats = {
    totalOrders: 45,
    pendingOrders: 3,
    completedOrders: 42,
    totalRevenue: 1250.5,
    averageOrderValue: 27.78,
  };

  const deliveryZones = [
    { postalCode: "75001", deliveryFee: 5.0 },
    { postalCode: "75002", deliveryFee: 5.0 },
    { postalCode: "75003", deliveryFee: 6.0 },
    { postalCode: "75004", deliveryFee: 6.0 },
  ];

  const timeSlots = [
    { day: "Monday", startTime: "09:00", endTime: "18:00" },
    { day: "Tuesday", startTime: "09:00", endTime: "18:00" },
    { day: "Wednesday", startTime: "09:00", endTime: "18:00" },
    { day: "Thursday", startTime: "09:00", endTime: "18:00" },
    { day: "Friday", startTime: "09:00", endTime: "18:00" },
    { day: "Saturday", startTime: "10:00", endTime: "16:00" },
  ];

  const handleToggleService = async () => {
    setIsLoading(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsActive(!isActive);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>{t("status.title")}</span>
              </CardTitle>
              <CardDescription>{t("status.description")}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleService}
                disabled={isLoading}
              />
              <span className="text-sm font-medium">
                {isActive ? t("status.active") : t("status.inactive")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingSpinner className="h-4 w-4" />}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalOrders")}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.pendingOrders")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.awaiting")}
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
              {stats.totalRevenue.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.monthly")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.averageOrder")}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageOrderValue.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.perOrder")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delivery Zones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>{t("zones.title")}</span>
                </CardTitle>
                <CardDescription>{t("zones.description")}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/merchant/cart-drop/zones">
                  <Settings className="h-4 w-4 mr-2" />
                  {t("actions.configure")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deliveryZones.map((zone, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="font-medium">{zone.postalCode}</span>
                  <Badge variant="secondary">
                    {zone.deliveryFee.toFixed(2)}€
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>{t("timeSlots.title")}</span>
                </CardTitle>
                <CardDescription>{t("timeSlots.description")}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/merchant/cart-drop/time-slots">
                  <Settings className="h-4 w-4 mr-2" />
                  {t("actions.configure")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="font-medium">{slot.day}</span>
                  <span className="text-sm text-muted-foreground">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("actions.title")}</CardTitle>
          <CardDescription>{t("actions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button asChild>
              <Link href="/merchant/cart-drop/orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t("actions.viewOrders")}
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/merchant/cart-drop/settings">
                <Settings className="h-4 w-4 mr-2" />
                {t("actions.settings")}
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/merchant/cart-drop/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                {t("actions.analytics")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
