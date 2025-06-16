"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent } from "@/components/ui/card";

// Icons
import { FileText, CheckCircle, Clock, Euro } from "lucide-react";

// Types
interface Contract {
  status: string;
  monthlyValue?: number;
  totalValue?: number;
}

interface ContractStatsProps {
  contracts: Contract[];
}

export function ContractStats({ contracts }: ContractStatsProps) {
  const t = useTranslations("contracts");

  const stats = {
    total: contracts.length,
    active: contracts.filter((contract) => contract.status === "ACTIVE").length,
    pending: contracts.filter((contract) => contract.status === "PENDING")
      .length,
    totalMonthlyValue: contracts
      .filter(
        (contract) => contract.status === "ACTIVE" && contract.monthlyValue,
      )
      .reduce((sum, contract) => sum + (contract.monthlyValue || 0), 0)};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">
                {t("totalContracts")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("activeContracts")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("pendingContracts")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Euro className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalMonthlyValue}€
              </div>
              <p className="text-sm text-muted-foreground">
                {t("monthlyRevenue")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
