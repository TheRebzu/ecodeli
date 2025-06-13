"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  FileText,
  Calendar,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  RefreshCcw,
} from "lucide-react";

// Types
interface Contract {
  id: string;
  title: string;
  description?: string;
  contractNumber: string;
  status:
    | "DRAFT"
    | "PENDING"
    | "ACTIVE"
    | "SUSPENDED"
    | "TERMINATED"
    | "EXPIRED";
  type: "SERVICE" | "DELIVERY" | "SUBSCRIPTION" | "PARTNERSHIP";
  startDate: Date;
  endDate?: Date;
  monthlyValue?: number;
  totalValue?: number;
  merchant: {
    id: string;
    name: string;
    logo?: string;
    category: string;
  };
  lastModified: Date;
  signedAt?: Date;
  nextPayment?: Date;
  autoRenewal: boolean;
}

interface ContractListProps {
  contracts: Contract[];
  isLoading: boolean;
  error?: string | null;
  onView: (id: string) => void;
  onDownload: (id: string) => void;
  onRenew?: (id: string) => void;
}

// Composant pour afficher un contrat
const ContractCard = ({
  contract,
  onView,
  onDownload,
  onRenew,
}: {
  contract: Contract;
  onView: (id: string) => void;
  onDownload: (id: string) => void;
  onRenew?: (id: string) => void;
}) => {
  const t = useTranslations("contracts");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "SUSPENDED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "TERMINATED":
      case "EXPIRED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "TERMINATED":
      case "EXPIRED":
        return <XCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const isExpiringSoon = () => {
    if (!contract.endDate) return false;
    const daysUntilExpiry = Math.ceil(
      (contract.endDate.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{contract.title}</h3>
              {isExpiringSoon() && (
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t("expiringSoon")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              N° {contract.contractNumber}
            </p>
          </div>
          <Badge variant="outline" className={getStatusColor(contract.status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(contract.status)}
              {t(`status.${contract.status.toLowerCase()}`)}
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations du marchand */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{contract.merchant.name}</p>
            <p className="text-sm text-muted-foreground">
              {contract.merchant.category}
            </p>
          </div>
        </div>

        {/* Détails du contrat */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("startDate")}:</span>
            </div>
            <p className="font-medium">
              {format(contract.startDate, "d MMM yyyy", { locale: fr })}
            </p>
          </div>

          {contract.endDate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("endDate")}:</span>
              </div>
              <p className="font-medium">
                {format(contract.endDate, "d MMM yyyy", { locale: fr })}
              </p>
            </div>
          )}

          {contract.monthlyValue && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("monthlyValue")}:
                </span>
              </div>
              <p className="font-medium">{contract.monthlyValue}€</p>
            </div>
          )}

          {contract.totalValue && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("totalValue")}:
                </span>
              </div>
              <p className="font-medium">{contract.totalValue}€</p>
            </div>
          )}
        </div>

        {/* Informations additionnelles */}
        {contract.nextPayment && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{t("nextPayment")}:</span>
              <span>
                {format(contract.nextPayment, "d MMM yyyy", { locale: fr })}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(contract.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("view")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(contract.id)}
          >
            <Download className="h-4 w-4 mr-1" />
            {t("download")}
          </Button>

          {contract.status === "ACTIVE" &&
            onRenew &&
            contract.endDate &&
            isExpiringSoon() && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onRenew(contract.id)}
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                {t("renew")}
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export function ContractList({
  contracts,
  isLoading,
  error,
  onView,
  onDownload,
  onRenew,
}: ContractListProps) {
  const t = useTranslations("contracts");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t("noContracts")}</h3>
        <p className="text-muted-foreground mb-4">{t("noContractsDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <ContractCard
          key={contract.id}
          contract={contract}
          onView={onView}
          onDownload={onDownload}
          onRenew={onRenew}
        />
      ))}
    </div>
  );
}
