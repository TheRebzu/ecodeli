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
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Icons
import { Search, Filter, RotateCcw } from "lucide-react";

interface ServiceFiltersProps {
  statusFilter: string;
  categoryFilter: string;
  locationFilter: string;
  priceTypeFilter: string;
  searchQuery: string;
  emergencyOnly: boolean;
  equipmentOnly: boolean;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onLocationChange: (location: string) => void;
  onPriceTypeChange: (priceType: string) => void;
  onSearchChange: (query: string) => void;
  onEmergencyChange: (emergency: boolean) => void;
  onEquipmentChange: (equipment: boolean) => void;
  onReset: () => void;
  categories: Array<{ id: string; name: string }>;
}

export function ServiceFilters({
  statusFilter,
  categoryFilter,
  locationFilter,
  priceTypeFilter,
  searchQuery,
  emergencyOnly,
  equipmentOnly,
  onStatusChange,
  onCategoryChange,
  onLocationChange,
  onPriceTypeChange,
  onSearchChange,
  onEmergencyChange,
  onEquipmentChange,
  onReset,
  categories,
}: ServiceFiltersProps) {
  const t = useTranslations("providerServices");

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

        {/* Filtres principaux */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("status")}</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="ACTIVE">{t("status.active")}</SelectItem>
                <SelectItem value="INACTIVE">{t("status.inactive")}</SelectItem>
                <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
                <SelectItem value="SUSPENDED">
                  {t("status.suspended")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("category")}</label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("location")}</label>
            <Select value={locationFilter} onValueChange={onLocationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allLocations")}</SelectItem>
                <SelectItem value="AT_CUSTOMER">
                  {t("location.at_customer")}
                </SelectItem>
                <SelectItem value="AT_PROVIDER">
                  {t("location.at_provider")}
                </SelectItem>
                <SelectItem value="REMOTE">{t("location.remote")}</SelectItem>
                <SelectItem value="FLEXIBLE">
                  {t("location.flexible")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("priceType")}</label>
            <Select value={priceTypeFilter} onValueChange={onPriceTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allPriceTypes")}</SelectItem>
                <SelectItem value="FIXED">{t("priceType.fixed")}</SelectItem>
                <SelectItem value="HOURLY">{t("priceType.hourly")}</SelectItem>
                <SelectItem value="DAILY">{t("priceType.daily")}</SelectItem>
                <SelectItem value="CUSTOM">{t("priceType.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cases à cocher pour les options spéciales */}
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-medium">{t("serviceOptions")}</h4>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="emergency"
              checked={emergencyOnly}
              onCheckedChange={onEmergencyChange}
            />
            <label htmlFor="emergency" className="text-sm font-medium">
              {t("emergencyServices")}
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="equipment"
              checked={equipmentOnly}
              onCheckedChange={onEquipmentChange}
            />
            <label htmlFor="equipment" className="text-sm font-medium">
              {t("requiresEquipment")}
            </label>
          </div>
        </div>

        {/* Filtres rapides */}
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-medium">{t("quickFilters")}</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange("ACTIVE")}
            >
              {t("activeOnly")}
            </Button>

            <Button
              variant={emergencyOnly ? "default" : "outline"}
              size="sm"
              onClick={() => onEmergencyChange(!emergencyOnly)}
            >
              {t("emergency")}
            </Button>

            <Button
              variant={locationFilter === "AT_CUSTOMER" ? "default" : "outline"}
              size="sm"
              onClick={() => onLocationChange("AT_CUSTOMER")}
            >
              {t("atCustomer")}
            </Button>
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
