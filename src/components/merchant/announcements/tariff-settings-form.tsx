"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CircleDollarSign, Save } from "lucide-react";

// Define the form schema
const formSchema = z.object({ price: z.number().optional(),
  isPriceNegotiable: z.boolean().default(true),
  priceRange: z.array(z.number()).default([0, 100]),
  pricingMethod: z.string().default("FIXED"),
  weightPricing: z
    .array(
      z.object({
        minWeight: z.number(),
        maxWeight: z.number(),
        price: z.number() }),
    )
    .optional(),
  distancePricing: z
    .array(
      z.object({ minDistance: z.number(),
        maxDistance: z.number(),
        pricePerKm: z.number() }),
    )
    .optional(),
  rushHourFee: z.number().optional(),
  weekendFee: z.number().optional(),
  holidayFee: z.number().optional(),
  insuranceAmount: z.number().optional(),
  handlingFee: z.number().optional(),
  paymentMethod: z.enum(["CARD", "CASH", "BOTH"]).default("BOTH"),
  acceptPartialPayment: z.boolean().default(false)});

export type TariffSettingsData = z.infer<typeof formSchema>;

interface TariffSettingsFormProps {
  initialValues?: Partial<TariffSettingsData>;
  isSubmitting?: boolean;
  onSubmit?: (data: TariffSettingsData) => void;
  // Supporting props for create-announcement page
  data?: any;
  onUpdateForm?: (data: any) => void;
  isLoading?: boolean;
}

export function TariffSettingsForm({
  initialValues,
  isSubmitting = false,
  onSubmit,
  data,
  onUpdateForm,
  isLoading}: TariffSettingsFormProps) {
  // Use create-announcement page props if provided
  const effectiveInitialValues = data || initialValues;
  const effectiveIsSubmitting =
    isLoading !== undefined ? isLoading : isSubmitting;
  const effectiveOnSubmit = onUpdateForm || onSubmit;
  const t = useTranslations("announcements.tariff");
  const [priceDisplay, setPriceDisplay] = useState(
    initialValues?.price?.toString() || "",
  );
  const form = useForm<TariffSettingsData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: undefined,
      isPriceNegotiable: true,
      priceRange: [20, 50],
      pricingMethod: "FIXED",
      weightPricing: [],
      distancePricing: [],
      rushHourFee: 0,
      weekendFee: 0,
      holidayFee: 0,
      insuranceAmount: 0,
      handlingFee: 0,
      paymentMethod: "BOTH",
      acceptPartialPayment: false,
      ...initialValues}});

  const pricingMethod = form.watch("pricingMethod");
  const isPriceNegotiable = form.watch("isPriceNegotiable");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("pricing")}</CardTitle>
            <CardDescription>{t("pricingDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pricingMethod"
              render={({ field  }) => (
                <FormItem>
                  <FormLabel>{t("pricingMethod")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectPricingMethod")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FIXED">
                        {t("pricingMethods.fixed")}
                      </SelectItem>
                      <SelectItem value="WEIGHT_BASED">
                        {t("pricingMethods.weightBased")}
                      </SelectItem>
                      <SelectItem value="DISTANCE_BASED">
                        {t("pricingMethods.distanceBased")}
                      </SelectItem>
                      <SelectItem value="NEGOTIABLE">
                        {t("pricingMethods.negotiable")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("pricingMethodDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {pricingMethod === "FIXED" && (
              <FormField
                control={form.control}
                name="price"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("price")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={priceDisplay}
                          onChange={(e) => {
                            setPriceDisplay(e.target.value);
                            field.onChange(parseFloat(e.target.value) || 0);
                          }}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {pricingMethod === "NEGOTIABLE" && (
              <FormField
                control={form.control}
                name="priceRange"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("priceRange")}</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                        <div className="flex justify-between items-center">
                          <Badge
                            variant="outline"
                            className="font-normal text-sm"
                          >
                            Min: {field.value[0]}€
                          </Badge>
                          <Badge
                            variant="outline"
                            className="font-normal text-sm"
                          >
                            Max: {field.value[1]}€
                          </Badge>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("priceRangeDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isPriceNegotiable"
              render={({ field  }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("isPriceNegotiable")}
                    </FormLabel>
                    <FormDescription>
                      {t("isPriceNegotiableDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("additionalFees")}</CardTitle>
            <CardDescription>{t("additionalFeesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rushHourFee"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("rushHourFee")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("rushHourFeeDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weekendFee"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("weekendFee")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("weekendFeeDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="holidayFee"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("holidayFee")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("holidayFeeDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="insuranceAmount"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("insuranceAmount")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("insuranceAmountDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="handlingFee"
                render={({ field  }) => (
                  <FormItem>
                    <FormLabel>{t("handlingFee")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-muted-foreground">€</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t("handlingFeeDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("paymentOptions")}</CardTitle>
            <CardDescription>{t("paymentOptionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field  }) => (
                <FormItem>
                  <FormLabel>{t("paymentMethod")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectPaymentMethod")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CARD">
                        {t("paymentMethods.card")}
                      </SelectItem>
                      <SelectItem value="CASH">
                        {t("paymentMethods.cash")}
                      </SelectItem>
                      <SelectItem value="BOTH">
                        {t("paymentMethods.both")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("paymentMethodDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptPartialPayment"
              render={({ field  }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("acceptPartialPayment")}
                    </FormLabel>
                    <FormDescription>
                      {t("acceptPartialPaymentDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>{t("saving")}</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("save")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
