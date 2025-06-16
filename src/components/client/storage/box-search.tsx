"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  boxSearchSchema,
  BoxSearchInput} from "@/schemas/storage/storage.schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils/common";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import { Slider } from "@/components/ui/slider";
import { useWarehouses } from "@/hooks/common/use-storage";

export interface BoxSearchFormProps {
  onSearch: (data: BoxSearchInput) => void;
  isSubmitting?: boolean;
  submitText?: string;
  defaultValues?: Partial<BoxSearchInput>;
}

export function BoxSearchForm({
  onSearch,
  isSubmitting = false,
  submitText,
  defaultValues}: BoxSearchFormProps) {
  const t = useTranslations("storage");
  const { warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [sizeRange, setSizeRange] = useState([0, 10]);

  const form = useForm<BoxSearchInput>({
    resolver: zodResolver(boxSearchSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours par défaut
      features: [],
      ...defaultValues}});

  const features = [
    { id: "climate-controlled", label: t("features.climateControlled") },
    { id: "secure", label: t("features.secure") },
    { id: "24h-access", label: t("features.24hAccess") }];

  // Mise à jour des champs dépendants du slider
  const handlePriceRangeChange = (values: number[]) => {
    setPriceRange(values);
    form.setValue("maxPrice", values[1]);
  };

  const handleSizeRangeChange = (values: number[]) => {
    setSizeRange(values);
    form.setValue("minSize", values[0]);
    form.setValue("maxSize", values[1]);
  };

  const onSubmit = (data: BoxSearchInput) => {
    onSearch(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Entrepôt */}
          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field  }) => (
              <FormItem>
                <FormLabel>{t("form.warehouse")}</FormLabel>
                <Select
                  disabled={isLoadingWarehouses}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.selectWarehouse")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses?.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("form.warehouseDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type de box */}
          <FormField
            control={form.control}
            name="boxType"
            render={({ field  }) => (
              <FormItem>
                <FormLabel>{t("form.boxType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.selectBoxType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="STANDARD">
                      {t("boxTypes.standard")}
                    </SelectItem>
                    <SelectItem value="CLIMATE_CONTROLLED">
                      {t("boxTypes.climateControlled")}
                    </SelectItem>
                    <SelectItem value="SECURE">
                      {t("boxTypes.secure")}
                    </SelectItem>
                    <SelectItem value="EXTRA_LARGE">
                      {t("boxTypes.extraLarge")}
                    </SelectItem>
                    <SelectItem value="REFRIGERATED">
                      {t("boxTypes.refrigerated")}
                    </SelectItem>
                    <SelectItem value="FRAGILE">
                      {t("boxTypes.fragile")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("form.boxTypeDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date de début */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field  }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("form.startDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale })
                        ) : (
                          <span>{t("form.pickDate")}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => date && field.onChange(date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t("form.startDateDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date de fin */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field  }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("form.endDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale })
                        ) : (
                          <span>{t("form.pickDate")}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => date && field.onChange(date)}
                      disabled={(date) =>
                        date <= (form.getValues().startDate || new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t("form.endDateDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          {/* Prix maximum */}
          <div className="space-y-2">
            <FormLabel>{t("form.priceRange")}</FormLabel>
            <Slider
              defaultValue={priceRange}
              min={0}
              max={200}
              step={1}
              onValueChange={handlePriceRangeChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0€</span>
              <span>
                {priceRange[1]}€ {t("form.perDay")}
              </span>
            </div>
            <FormDescription>{t("form.priceDescription")}</FormDescription>
          </div>

          {/* Taille */}
          <div className="space-y-2">
            <FormLabel>{t("form.sizeRange")}</FormLabel>
            <Slider
              defaultValue={sizeRange}
              min={0}
              max={20}
              step={0.5}
              onValueChange={handleSizeRangeChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{sizeRange[0]} m³</span>
              <span>{sizeRange[1]} m³</span>
            </div>
            <FormDescription>{t("form.sizeDescription")}</FormDescription>
          </div>

          {/* Caractéristiques */}
          <FormField
            control={form.control}
            name="features"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">
                    {t("form.features")}
                  </FormLabel>
                  <FormDescription>
                    {t("form.featuresDescription")}
                  </FormDescription>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {features.map((feature) => (
                    <FormField
                      key={feature.id}
                      control={form.control}
                      name="features"
                      render={({ field  }) => {
                        return (
                          <FormItem
                            key={feature.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(feature.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([
                                        ...(field.value || []),
                                        feature.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== feature.id,
                                        ),
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {feature.label}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {submitText || t("form.search")}
        </Button>
      </form>
    </Form>
  );
}
