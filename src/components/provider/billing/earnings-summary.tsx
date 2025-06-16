"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Award,
  BarChart3} from "lucide-react";

// Types
interface EarningsSummary {
  currentMonth: {
    earnings: number;
    hours: number;
    interventions: number;
    averageHourlyRate: number;
    commission: number;
    netEarnings: number;
  };
  previousMonth: {
    earnings: number;
    hours: number;
    interventions: number;
  };
  yearToDate: {
    earnings: number;
    hours: number;
    interventions: number;
    averageHourlyRate: number;
  };
  goals: {
    monthlyTarget: number;
    yearlyTarget: number;
    monthlyProgress: number;
    yearlyProgress: number;
  };
  trends: {
    earningsGrowth: number;
    hoursGrowth: number;
    rateGrowth: number;
  };
}

interface EarningsSummaryProps {
  summary: EarningsSummary;
}

export function EarningsSummary({ summary }: EarningsSummaryProps) {
  const t = useTranslations("providerBilling");

  const formatCurrency = (amount: number) => `${amount.toFixed(0)}€`;
  const formatGrowth = (growth: number) => {
    const prefix = growth > 0 ? "+" : "";
    return `${prefix}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Revenus du mois */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Euro className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.currentMonth.netEarnings)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("monthlyEarnings")}
              </p>
              <div
                className={`flex items-center gap-1 text-xs ${getGrowthColor(summary.trends.earningsGrowth)}`}
              >
                {getGrowthIcon(summary.trends.earningsGrowth)}
                <span>{formatGrowth(summary.trends.earningsGrowth)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heures travaillées */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-blue-600">
                {summary.currentMonth.hours}h
              </div>
              <p className="text-sm text-muted-foreground">
                {t("monthlyHours")}
              </p>
              <div
                className={`flex items-center gap-1 text-xs ${getGrowthColor(summary.trends.hoursGrowth)}`}
              >
                {getGrowthIcon(summary.trends.hoursGrowth)}
                <span>{formatGrowth(summary.trends.hoursGrowth)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarif horaire moyen */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(summary.currentMonth.averageHourlyRate)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("averageHourlyRate")}
              </p>
              <div
                className={`flex items-center gap-1 text-xs ${getGrowthColor(summary.trends.rateGrowth)}`}
              >
                {getGrowthIcon(summary.trends.rateGrowth)}
                <span>{formatGrowth(summary.trends.rateGrowth)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interventions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-orange-600">
                {summary.currentMonth.interventions}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("monthlyInterventions")}
              </p>
              <p className="text-xs text-muted-foreground">
                {(
                  summary.currentMonth.hours /
                  summary.currentMonth.interventions
                ).toFixed(1)}
                h/{t("avg")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectifs mensuels */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t("monthlyGoals")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("earningsTarget")}</span>
              <span className="font-medium">
                {formatCurrency(summary.currentMonth.netEarnings)} /{" "}
                {formatCurrency(summary.goals.monthlyTarget)}
              </span>
            </div>
            <Progress value={summary.goals.monthlyProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {summary.goals.monthlyProgress.toFixed(0)}% {t("completed")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance annuelle */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t("yearlyPerformance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold">
                {formatCurrency(summary.yearToDate.earnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("yearToDateEarnings")}
              </p>
            </div>
            <div>
              <div className="text-xl font-bold">
                {summary.yearToDate.hours}h
              </div>
              <p className="text-xs text-muted-foreground">
                {t("yearToDateHours")}
              </p>
            </div>
            <div>
              <div className="text-xl font-bold">
                {summary.yearToDate.interventions}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("yearToDateInterventions")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("yearlyTarget")}</span>
              <span className="font-medium">
                {formatCurrency(summary.yearToDate.earnings)} /{" "}
                {formatCurrency(summary.goals.yearlyTarget)}
              </span>
            </div>
            <Progress value={summary.goals.yearlyProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {summary.goals.yearlyProgress.toFixed(0)}% {t("completed")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comparaison mensuelle */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">{t("monthlyComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {formatCurrency(summary.currentMonth.earnings)}
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("thisMonth")}
              </p>
              <div
                className={`text-sm font-medium ${getGrowthColor(summary.trends.earningsGrowth)}`}
              >
                {formatGrowth(summary.trends.earningsGrowth)} vs{" "}
                {t("lastMonth")}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {summary.currentMonth.hours}h
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("thisMonth")}
              </p>
              <div
                className={`text-sm font-medium ${getGrowthColor(summary.trends.hoursGrowth)}`}
              >
                {formatGrowth(summary.trends.hoursGrowth)} vs {t("lastMonth")}
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {formatCurrency(summary.currentMonth.averageHourlyRate)}
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("averageRate")}
              </p>
              <div
                className={`text-sm font-medium ${getGrowthColor(summary.trends.rateGrowth)}`}
              >
                {formatGrowth(summary.trends.rateGrowth)} vs {t("lastMonth")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
