"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Icons
import { Search, Filter, RotateCcw } from "lucide-react";

interface ContractFiltersProps {
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export function ContractFilters({
  statusFilter,
  typeFilter,
  searchQuery,
  onStatusChange,
  onTypeChange,
  onSearchChange,
  onReset}: ContractFiltersProps) {
  const t = useTranslations("contracts");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {t("filters")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("status")}</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="ACTIVE">{t("status.active")}</SelectItem>
                <SelectItem value="PENDING">{t("status.pending")}</SelectItem>
                <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
                <SelectItem value="SUSPENDED">
                  {t("status.suspended")}
                </SelectItem>
                <SelectItem value="TERMINATED">
                  {t("status.terminated")}
                </SelectItem>
                <SelectItem value="EXPIRED">{t("status.expired")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("type")}</label>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                <SelectItem value="SERVICE">{t("type.service")}</SelectItem>
                <SelectItem value="DELIVERY">{t("type.delivery")}</SelectItem>
                <SelectItem value="SUBSCRIPTION">
                  {t("type.subscription")}
                </SelectItem>
                <SelectItem value="PARTNERSHIP">
                  {t("type.partnership")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bouton de réinitialisation */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("resetFilters")}
        </Button>
      </CardContent>
    </Card>
  );
}
