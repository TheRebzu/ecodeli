"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger} from "@/components/ui/popover";
import { cn } from "@/lib/utils/common";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VerificationFilterFormProps {
  currentFilters: any;
  onFilterChange: (filters: any) => void;
}

export function VerificationFilterForm({
  currentFilters,
  onFilterChange}: VerificationFilterFormProps) {
  const t = useTranslations("admin.verification.filters");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentFilters.dateFrom || undefined,
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentFilters.dateTo || undefined,
  );

  // Ensure all required fields are present with default values
  const defaultValues = {
    status: currentFilters.status || "PENDING",
    page: currentFilters.page || 1,
    limit: currentFilters.limit || 10,
    sortBy: currentFilters.sortBy || "createdAt",
    sortDirection: currentFilters.sortDirection || "desc",
    role: currentFilters.role,
    search: currentFilters.search || ""};

  // @ts-ignore - Using any type to avoid complex type errors
  const form = useForm({ defaultValues });

  // @ts-ignore - Using any type to avoid complex type errors
  const handleSubmit = form.handleSubmit((data) => {
    onFilterChange({ ...data,
      dateFrom,
      dateTo });
  });

  const handleReset = () => {
    const resetValues = {
      status: "PENDING",
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortDirection: "desc",
      search: "",
      role: undefined};

    form.reset(resetValues);
    setDateFrom(undefined);
    setDateTo(undefined);
    onFilterChange({ ...resetValues,
      dateFrom: undefined,
      dateTo: undefined });
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Role filter */}
          <FormField
            control={form.control}
            name="role"
            render={({ field  }) => (
              <FormItem>
                <FormLabel>{t("role")}</FormLabel>
                <Select
                  onValueChange={(value) => {
                    if (value === "ALL") {
                      field.onChange(undefined);
                    } else {
                      field.onChange(value);
                    }
                  }}
                  value={field.value ? field.value : "ALL"}
                  defaultValue="ALL"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("allRoles")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ALL">{t("allRoles")}</SelectItem>
                    <SelectItem value={UserRole.DELIVERER}>
                      {t("roles.deliverer")}
                    </SelectItem>
                    <SelectItem value={UserRole.MERCHANT}>
                      {t("roles.merchant")}
                    </SelectItem>
                    <SelectItem value={UserRole.PROVIDER}>
                      {t("roles.provider")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Date range filter - From */}
          <FormItem>
            <FormLabel>{t("dateFrom")}</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !dateFrom && "text-muted-foreground",
                    )}
                  >
                    {dateFrom ? (
                      format(dateFrom, "PPP", { locale })
                    ) : (
                      <span>{t("selectDate")}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </FormItem>

          {/* Date range filter - To */}
          <FormItem>
            <FormLabel>{t("dateTo")}</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !dateTo && "text-muted-foreground",
                    )}
                  >
                    {dateTo ? (
                      format(dateTo, "PPP", { locale })
                    ) : (
                      <span>{t("selectDate")}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={fr}
                  initialFocus
                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                />
              </PopoverContent>
            </Popover>
          </FormItem>

          {/* Search */}
          <FormField
            control={form.control}
            name="search"
            render={({ field  }) => (
              <FormItem>
                <FormLabel>{t("search")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchPlaceholder")}
                      className="pl-8"
                      {...field}
                      value={field.value || ""}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleReset}>
            <X className="mr-2 h-4 w-4" />
            {t("reset")}
          </Button>
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            {t("filter")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
