"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, BarChart } from "@/components/ui/charts";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Activity,
  Shield,
  Clock,
  TrendingUp} from "lucide-react";
import { generateChartColors } from "@/utils/document-utils";

interface UserData {
  period: string;
  signups: number;
  active: number;
  verified: number;
}

interface UserByRole {
  role: string;
  count: number;
  percentage: number;
  growth: number;
}

interface VerificationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface UserStatsCardProps {
  title: string;
  description?: string;
  data: UserData[];
  usersByRole?: UserByRole[];
  verificationStats?: VerificationStats;
  totalUsers?: number;
  activeUsers?: number;
  newUsersThisMonth?: number;
  userGrowth?: number;
  retentionRate?: number;
  className?: string;
}

export function UserStatsCard({
  title,
  description,
  data,
  usersByRole,
  verificationStats,
  totalUsers,
  activeUsers,
  newUsersThisMonth,
  userGrowth,
  retentionRate,
  className = ""}: UserStatsCardProps) {
  // Calculs automatiques
  const calculatedTotalUsers =
    totalUsers ?? (data[data.length - 1]?.signups || 0);
  const calculatedActiveUsers =
    activeUsers ?? (data[data.length - 1]?.active || 0);
  const calculatedNewUsers =
    newUsersThisMonth ??
    data.slice(-30).reduce((sum, item) => sum + item.signups, 0);

  const calculatedUserGrowth =
    userGrowth ??
    (() => {
      if (data.length < 2) return 0;
      const current = data
        .slice(-7)
        .reduce((sum, item) => sum + item.signups, 0);
      const previous = data
        .slice(-14, -7)
        .reduce((sum, item) => sum + item.signups, 0);
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    })();

  const calculatedRetentionRate =
    retentionRate ??
    (calculatedTotalUsers > 0
      ? (calculatedActiveUsers / calculatedTotalUsers) * 100
      : 0);

  // Données pour les graphiques
  const signupChartData = data.map((item) => ({ period: item.period,
    signups: item.signups,
    active: item.active,
    verified: item.verified }));

  const roleColors = generateChartColors(usersByRole?.length || 5);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge
            variant={calculatedUserGrowth >= 0 ? "default" : "destructive"}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {calculatedUserGrowth >= 0 ? "+" : ""}
            {calculatedUserGrowth.toFixed(1)}%
          </Badge>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Métriques principales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">
                  Utilisateurs totaux
                </p>
              </div>
              <p className="text-2xl font-bold">
                {calculatedTotalUsers.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                +{calculatedNewUsers} ce mois
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  Utilisateurs actifs
                </p>
              </div>
              <p className="text-xl font-semibold">
                {calculatedActiveUsers.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {calculatedRetentionRate.toFixed(1)}% de rétention
              </p>
            </div>
          </div>

          {/* Graphique des inscriptions */}
          <div className="h-[180px]">
            <AreaChart
              data={signupChartData}
              categories={["signups", "active"]}
              index="period"
              colors={["#3b82f6", "#22c55e"]}
              valueFormatter={(value) => value.toLocaleString()}
              showLegend={true}
              showGridLines={false}
              startEndOnly={true}
            />
          </div>

          {/* Répartition par rôles */}
          {usersByRole && usersByRole.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Répartition par rôles
              </h4>
              <div className="space-y-2">
                {usersByRole.map((role, index) => (
                  <div key={role.role} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: roleColors[index] }}
                        />
                        <span className="font-medium">{role.role}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{role.count}</span>
                        <Badge
                          variant={role.growth >= 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {role.growth >= 0 ? "+" : ""}
                          {role.growth.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={role.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques de vérification */}
          {verificationStats && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                État des vérifications
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <p className="text-xs text-muted-foreground">En attente</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {verificationStats.pending}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <UserCheck className="h-3 w-3 text-green-500" />
                    <p className="text-xs text-muted-foreground">Approuvées</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {verificationStats.approved}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <UserX className="h-3 w-3 text-red-500" />
                    <p className="text-xs text-muted-foreground">Rejetées</p>
                  </div>
                  <p className="text-lg font-semibold">
                    {verificationStats.rejected}
                  </p>
                </div>
              </div>

              {/* Taux d'approbation */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Taux d'approbation</span>
                  <span className="font-medium">
                    {verificationStats.total > 0
                      ? (
                          (verificationStats.approved /
                            verificationStats.total) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    verificationStats.total > 0
                      ? (verificationStats.approved / verificationStats.total) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            </div>
          )}

          {/* Métriques de performance */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Croissance</p>
              <p
                className={`text-lg font-semibold ${
                  calculatedUserGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {calculatedUserGrowth >= 0 ? "+" : ""}
                {calculatedUserGrowth.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rétention</p>
              <p
                className={`text-lg font-semibold ${
                  calculatedRetentionRate >= 70
                    ? "text-green-600"
                    : calculatedRetentionRate >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {calculatedRetentionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
