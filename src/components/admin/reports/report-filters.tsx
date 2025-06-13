"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/common";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, RotateCcw } from "lucide-react";

interface ReportFilters {
  startDate: string;
  endDate: string;
  granularity: string;
  comparison: boolean;
  categoryFilter: string;
  userRoleFilter: string;
}

interface ReportFilterProps {
  filters: ReportFilters;
  onFilterChange: (filters: Partial<ReportFilters>) => void;
}

export function ReportFilters({ filters, onFilterChange }: ReportFilterProps) {
  const t = useTranslations("admin.reports");
  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined,
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined,
  );

  const handleGranularityChange = (value: string) => {
    onFilterChange({ granularity: value });
  };

  const handleComparisonChange = (checked: boolean) => {
    onFilterChange({ comparison: checked });
  };

  const handleCategoryFilterChange = (value: string) => {
    onFilterChange({ categoryFilter: value });
  };

  const handleUserRoleFilterChange = (value: string) => {
    onFilterChange({ userRoleFilter: value });
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    if (date) {
      onFilterChange({ startDate: format(date, "yyyy-MM-dd") });
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    if (date) {
      onFilterChange({ endDate: format(date, "yyyy-MM-dd") });
    }
  };

  const handleSetPredefinedRange = (
    range:
      | "this-week"
      | "this-month"
      | "last-month"
      | "last-3-months"
      | "year-to-date",
  ) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (range) {
      case "this-week":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case "this-month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last-month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last-3-months":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "year-to-date":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setFromDate(start);
    setToDate(end);
    onFilterChange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  const resetFilters = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    setFromDate(firstDayOfMonth);
    setToDate(now);

    onFilterChange({
      startDate: format(firstDayOfMonth, "yyyy-MM-dd"),
      endDate: format(now, "yyyy-MM-dd"),
      granularity: "day",
      comparison: false,
      categoryFilter: "",
      userRoleFilter: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>{t("filters.dateRange")}</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal flex-1",
                    !fromDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? (
                    format(fromDate, "PPP", { locale: fr })
                  ) : (
                    <span>{t("filters.pickDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal flex-1",
                    !toDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? (
                    format(toDate, "PPP", { locale: fr })
                  ) : (
                    <span>{t("filters.pickDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("filters.predefinedRanges")}</Label>
          <Select onValueChange={handleSetPredefinedRange}>
            <SelectTrigger>
              <SelectValue placeholder={t("filters.selectRange")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">{t("filters.thisWeek")}</SelectItem>
              <SelectItem value="this-month">
                {t("filters.thisMonth")}
              </SelectItem>
              <SelectItem value="last-month">
                {t("filters.lastMonth")}
              </SelectItem>
              <SelectItem value="last-3-months">
                {t("filters.last3Months")}
              </SelectItem>
              <SelectItem value="year-to-date">
                {t("filters.yearToDate")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("filters.granularity")}</Label>
          <Select
            value={filters.granularity}
            onValueChange={handleGranularityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.selectGranularity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("filters.daily")}</SelectItem>
              <SelectItem value="week">{t("filters.weekly")}</SelectItem>
              <SelectItem value="month">{t("filters.monthly")}</SelectItem>
              <SelectItem value="quarter">{t("filters.quarterly")}</SelectItem>
              <SelectItem value="year">{t("filters.yearly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("filters.comparison")}</Label>
          <div className="flex items-center space-x-2 h-10 pt-2">
            <Switch
              id="comparison-mode"
              checked={filters.comparison}
              onCheckedChange={handleComparisonChange}
            />
            <Label htmlFor="comparison-mode" className="cursor-pointer">
              {t("filters.enableComparison")}
            </Label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("filters.category")}</Label>
          <Select
            value={filters.categoryFilter}
            onValueChange={handleCategoryFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("filters.allCategories")}</SelectItem>
              <SelectItem value="express">
                {t("filters.categories.express")}
              </SelectItem>
              <SelectItem value="standard">
                {t("filters.categories.standard")}
              </SelectItem>
              <SelectItem value="eco">{t("filters.categories.eco")}</SelectItem>
              <SelectItem value="international">
                {t("filters.categories.international")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("filters.userRole")}</Label>
          <Select
            value={filters.userRoleFilter}
            onValueChange={handleUserRoleFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.allUserRoles")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("filters.allUserRoles")}</SelectItem>
              <SelectItem value="CLIENT">
                {t("filters.roles.client")}
              </SelectItem>
              <SelectItem value="DELIVERER">
                {t("filters.roles.deliverer")}
              </SelectItem>
              <SelectItem value="MERCHANT">
                {t("filters.roles.merchant")}
              </SelectItem>
              <SelectItem value="PROVIDER">
                {t("filters.roles.provider")}
              </SelectItem>
              <SelectItem value="ADMIN">{t("filters.roles.admin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex items-end">
          <Button variant="outline" onClick={resetFilters} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("filters.resetFilters")}
          </Button>
        </div>
      </div>
    </div>
  );
}
