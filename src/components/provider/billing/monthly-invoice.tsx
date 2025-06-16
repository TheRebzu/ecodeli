"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Euro,
  Clock,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle} from "lucide-react";

// Types
interface MonthlyInvoice {
  id: string;
  invoiceNumber: string;
  period: {
    startDate: Date;
    endDate: Date;
    month: number;
    year: number;
  };
  status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED";
  amounts: {
    totalHT: number;
    totalTTC: number;
    vatAmount: number;
    commission: number;
    netAmount: number;
  };
  services: {
    totalInterventions: number;
    totalHours: number;
    averageHourlyRate: number;
    topServices: Array<{
      name: string;
      count: number;
      revenue: number;
    }>;
  };
  pdfUrl?: string;
  issuedAt?: Date;
  paidAt?: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MonthlyInvoiceProps {
  invoice: MonthlyInvoice;
  onDownload: (id: string) => void;
  onView: (id: string) => void;
}

export function MonthlyInvoice({
  invoice,
  onDownload,
  onView}: MonthlyInvoiceProps) {
  const t = useTranslations("providerBilling");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "ISSUED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PAID":
        return "bg-green-100 text-green-800 border-green-200";
      case "OVERDUE":
        return "bg-red-100 text-red-800 border-red-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4" />;
      case "OVERDUE":
        return <AlertCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatPeriod = (startDate: Date, endDate: Date) => {
    return `${format(startDate, "d MMM", { locale })} - ${format(endDate, "d MMM yyyy", { locale })}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {invoice.invoiceNumber}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatPeriod(
                    invoice.period.startDate,
                    invoice.period.endDate,
                  )}
                </p>
              </div>
            </div>
          </div>

          <Badge variant="outline" className={getStatusColor(invoice.status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(invoice.status)}
              {t(`status.${invoice.status.toLowerCase()}`)}
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Montants principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {invoice.amounts.totalTTC}€
            </div>
            <p className="text-xs text-muted-foreground">{t("totalTTC")}</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {invoice.amounts.netAmount}€
            </div>
            <p className="text-xs text-muted-foreground">{t("netAmount")}</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">
              {invoice.services.totalInterventions}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("interventions")}
            </p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">
              {invoice.services.totalHours}h
            </div>
            <p className="text-xs text-muted-foreground">{t("totalHours")}</p>
          </div>
        </div>

        <Separator />

        {/* Détails des services */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t("serviceBreakdown")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t("averageRate")}: {invoice.services.averageHourlyRate}€/h
              </span>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {t("commission")}: {invoice.amounts.commission}€
              </span>
            </div>
          </div>

          {/* Top services */}
          {invoice.services.topServices.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                {t("topServices")}:
              </p>
              <div className="space-y-1">
                {invoice.services.topServices
                  .slice(0, 3)
                  .map((service, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate">{service.name}</span>
                      <span className="font-medium">
                        {service.count} × {service.revenue}€
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Dates importantes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {invoice.issuedAt && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t("issuedAt")}</p>
                <p className="font-medium">
                  {format(invoice.issuedAt, "d MMM yyyy", { locale })}
                </p>
              </div>
            </div>
          )}

          {invoice.dueDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t("dueDate")}</p>
                <p className="font-medium">
                  {format(invoice.dueDate, "d MMM yyyy", { locale })}
                </p>
              </div>
            </div>
          )}

          {invoice.paidAt && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-muted-foreground">{t("paidAt")}</p>
                <p className="font-medium">
                  {format(invoice.paidAt, "d MMM yyyy", { locale })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(invoice.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("view")}
          </Button>

          {invoice.pdfUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(invoice.id)}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("download")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
