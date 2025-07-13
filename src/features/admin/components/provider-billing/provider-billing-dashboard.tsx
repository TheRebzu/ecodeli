"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface BillingStats {
  totalProviders: number;
  pendingInvoices: number;
  generatedInvoices: number;
  paidInvoices: number;
  totalAmount: number;
  averageAmount: number;
  overdueInvoices: number;
}

export function ProviderBillingDashboard() {
  const t = useTranslations("admin.providerBilling");
  const [stats, setStats] = useState<BillingStats>({
    totalProviders: 0,
    pendingInvoices: 0,
    generatedInvoices: 0,
    paidInvoices: 0,
    totalAmount: 0,
    averageAmount: 0,
    overdueInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/provider-billing/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching billing stats:", error);
        // Mock data for development
        setStats({
          totalProviders: 45,
          pendingInvoices: 12,
          generatedInvoices: 28,
          paidInvoices: 15,
          totalAmount: 45680,
          averageAmount: 1250,
          overdueInvoices: 3,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("stats.totalProviders")}
              </p>
              <p className="text-2xl font-bold">{stats.totalProviders}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("stats.pendingInvoices")}
              </p>
              <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("stats.totalAmount")}
              </p>
              <p className="text-2xl font-bold">
                {stats.totalAmount.toLocaleString()}€
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("stats.overdueInvoices")}
              </p>
              <p className="text-2xl font-bold">{stats.overdueInvoices}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      {/* Additional stats row */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t("stats.paidInvoices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.paidInvoices}</span>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {t("stats.paid")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {t("stats.generatedInvoices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {stats.generatedInvoices}
              </span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {t("stats.generated")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              {t("stats.averageAmount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {stats.averageAmount.toLocaleString()}€
              </span>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {t("stats.average")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
