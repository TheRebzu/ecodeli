"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Star,
  Calendar,
  Euro,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Target} from "lucide-react";

// Types
interface Service {
  status: string;
  rating: number;
  totalReviews: number;
  totalBookings: number;
  monthlyRevenue: number;
  price: number;
}

interface ServiceStatsProps {
  services: Service[];
}

export function ServiceStats({ services }: ServiceStatsProps) {
  const t = useTranslations("providerServices");

  const stats = {
    total: services.length,
    active: services.filter((s) => s.status === "ACTIVE").length,
    averageRating:
      services.length > 0
        ? services.reduce((sum, s) => sum + s.rating, 0) / services.length
        : 0,
    totalBookings: services.reduce((sum, s) => sum + s.totalBookings, 0),
    totalRevenue: services.reduce((sum, s) => sum + s.monthlyRevenue, 0),
    totalReviews: services.reduce((sum, s) => sum + s.totalReviews, 0),
    averagePrice:
      services.length > 0
        ? services.reduce((sum, s) => sum + s.price, 0) / services.length
        : 0};

  // Calcul du taux d'activation
  const activationRate =
    stats.total > 0 ? (stats.active / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Services actifs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-sm text-muted-foreground">
                {t("activeServices")}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={activationRate} className="h-1 w-16" />
                <span className="text-xs text-muted-foreground">
                  {activationRate.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note moyenne */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageRating.toFixed(1)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("averageRating")}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.totalReviews} {t("reviews")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Réservations totales */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalBookings}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("totalBookings")}
              </p>
              {stats.active > 0 && (
                <p className="text-xs text-muted-foreground">
                  {(stats.totalBookings / stats.active).toFixed(1)}/
                  {t("service")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenus mensuels */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Euro className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalRevenue}€
              </div>
              <p className="text-sm text-muted-foreground">
                {t("monthlyRevenue")}
              </p>
              {stats.active > 0 && (
                <p className="text-xs text-muted-foreground">
                  {(stats.totalRevenue / stats.active).toFixed(0)}€/
                  {t("service")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prix moyen */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-600">
                {stats.averagePrice.toFixed(0)}€
              </div>
              <p className="text-sm text-muted-foreground">
                {t("averagePrice")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taux de satisfaction */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.averageRating > 0
                  ? Math.round((stats.averageRating / 5) * 100)
                  : 0}
                %
              </div>
              <p className="text-sm text-muted-foreground">
                {t("satisfactionRate")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance globale */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t("performance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("serviceActivation")}
              </span>
              <div className="flex items-center gap-2">
                <Progress value={activationRate} className="w-24 h-2" />
                <span className="text-sm font-medium">
                  {activationRate.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("customerSatisfaction")}
              </span>
              <div className="flex items-center gap-2">
                <Progress
                  value={
                    stats.averageRating > 0
                      ? (stats.averageRating / 5) * 100
                      : 0
                  }
                  className="w-24 h-2"
                />
                <span className="text-sm font-medium">
                  {stats.averageRating > 0
                    ? Math.round((stats.averageRating / 5) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {stats.totalBookings > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("bookingSuccess")}
                </span>
                <div className="flex items-center gap-2">
                  <Progress value={85} className="w-24 h-2" />
                  <span className="text-sm font-medium">85%</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
