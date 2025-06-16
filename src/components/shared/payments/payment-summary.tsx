"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  AlertCircle,
  CheckCircle,
  ClockIcon,
  CreditCard,
  BanknoteIcon,
  Receipt,
  Zap,
  RotateCcw,
  XCircle,
  Info,
  Check,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/document-utils";
import { useTranslations } from "next-intl";
import { PaymentStatus } from "@prisma/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePaymentConfirmation } from "@/hooks/payment/use-payment";
import { useLocalizedFormat } from "@/hooks/use-localized-format";

// Type de variante pour Badge
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

export interface PaymentSummaryProps {
  paymentId: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt?: Date;
  paymentMethod?: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
  invoiceId?: string;
  onDownloadReceipt?: () => void;
  onViewInvoice?: () => void;
  fees?: number;
  taxes?: number;
  className?: string;
}

export function PaymentSummary({
  paymentId,
  amount,
  currency = "EUR",
  status,
  createdAt,
  updatedAt,
  paymentMethod,
  customerName,
  customerEmail,
  description,
  reference,
  metadata,
  invoiceId,
  onDownloadReceipt,
  onViewInvoice,
  fees = 0,
  taxes = 0,
  className,
}: PaymentSummaryProps) {
  const t = useTranslations("payment");
  const { formatCurrency, formatDate } = useLocalizedFormat();

  // Hook pour la confirmation de paiement (sans mode démo)
  const { isLoading: isConfirming } = usePaymentConfirmation();

  const getStatusInfo = (status: PaymentStatus) => {
    switch (status) {
      case "COMPLETED":
        return {
          label: t("statusCompleted"),
          variant: "default" as BadgeVariant,
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "PENDING":
        return {
          label: t("statusPending"),
          variant: "secondary" as BadgeVariant,
          icon: <ClockIcon className="h-4 w-4" />,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
        };
      case "FAILED":
        return {
          label: t("statusFailed"),
          variant: "destructive" as BadgeVariant,
          icon: <AlertCircle className="h-4 w-4" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "REFUNDED":
        return {
          label: t("statusRefunded"),
          variant: "outline" as BadgeVariant,
          icon: <BanknoteIcon className="h-4 w-4" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "DISPUTED":
        return {
          label: t("statusDisputed"),
          variant: "destructive" as BadgeVariant,
          icon: <AlertCircle className="h-4 w-4" />,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      default:
        return {
          label: status,
          variant: "secondary" as BadgeVariant,
          icon: <CreditCard className="h-4 w-4" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  const statusInfo = getStatusInfo(status);
  const subtotal = amount - fees - taxes;
  const total = amount;

  return (
    <Card className={`w-full ${className || ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("paymentSummary")}</CardTitle>
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            <Badge
              variant={statusInfo.variant}
              className="flex items-center gap-1"
            >
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {t("paymentId")}: {paymentId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Montant et date */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{t("amount")}</p>
            <p className="text-2xl font-bold">
              {formatCurrency(amount, currency)}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm font-medium text-gray-500">{t("date")}</p>
            <p className="text-sm">{formatDate(createdAt)}</p>
          </div>
        </div>

        <Separator />

        {/* Informations client */}
        {(customerName || customerEmail) && (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                {t("customerInformation")}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {customerName && (
                  <div>
                    <p className="text-gray-500">{t("name")}</p>
                    <p>{customerName}</p>
                  </div>
                )}
                {customerEmail && (
                  <div>
                    <p className="text-gray-500">{t("email")}</p>
                    <p>{customerEmail}</p>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Détails du paiement */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            {t("paymentDetails")}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {paymentMethod && (
              <div>
                <p className="text-gray-500">{t("paymentMethod")}</p>
                <p>{paymentMethod}</p>
              </div>
            )}
            {reference && (
              <div>
                <p className="text-gray-500">{t("reference")}</p>
                <p>{reference}</p>
              </div>
            )}
            {description && (
              <div className="col-span-2">
                <p className="text-gray-500">{t("description")}</p>
                <p>{description}</p>
              </div>
            )}
            {updatedAt && (
              <div>
                <p className="text-gray-500">{t("lastUpdated")}</p>
                <p>{formatDate(updatedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerte selon statut */}
        {status === "PENDING" && (
          <Alert
            className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
          >
            <ClockIcon className="h-4 w-4" />
            <AlertTitle>{t("pendingPaymentTitle")}</AlertTitle>
            <AlertDescription>
              {t("pendingPaymentDescription")}
            </AlertDescription>
          </Alert>
        )}

        {status === "FAILED" && (
          <Alert
            className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("failedPaymentTitle")}</AlertTitle>
            <AlertDescription>{t("failedPaymentDescription")}</AlertDescription>
          </Alert>
        )}

        {status === "REFUNDED" && (
          <Alert
            className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
          >
            <BanknoteIcon className="h-4 w-4" />
            <AlertTitle>{t("refundedPaymentTitle")}</AlertTitle>
            <AlertDescription>
              {t("refundedPaymentDescription")}
            </AlertDescription>
          </Alert>
        )}

        {status === "DISPUTED" && (
          <Alert
            className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("disputedPaymentTitle")}</AlertTitle>
            <AlertDescription>
              {t("disputedPaymentDescription")}
            </AlertDescription>
          </Alert>
        )}

        {/* Métadonnées supplémentaires */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              {t("additionalInformation")}
            </h3>
            <div className="text-sm space-y-1">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{key}</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">{t("subtotal")}</span>
            <span className="text-sm">{formatCurrency(subtotal, currency)}</span>
          </div>
          
          {fees > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("fees")}</span>
              <span className="text-sm">{formatCurrency(fees, currency)}</span>
            </div>
          )}
          
          {taxes > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("taxes")}</span>
              <span className="text-sm">{formatCurrency(taxes, currency)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="flex flex-wrap gap-2 justify-end">
        {onDownloadReceipt && (
          <Button variant="outline" size="sm" onClick={onDownloadReceipt}>
            <Download className="mr-2 h-4 w-4" />
            {t("downloadReceipt")}
          </Button>
        )}

        {onViewInvoice && invoiceId && (
          <Button variant="default" size="sm" onClick={onViewInvoice}>
            <Receipt className="mr-2 h-4 w-4" />
            {t("viewInvoice")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
