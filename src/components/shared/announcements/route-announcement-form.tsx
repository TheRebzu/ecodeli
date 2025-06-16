"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import {
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Route,
  Repeat,
  Bell,
  Save,
  Loader2,
  Plus,
  X} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AddressMapPicker } from "./address-map-picker";

// Schéma pour le formulaire d'annonce de trajet
const routeAnnouncementSchema = z.object({ title: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
  description: z.string().optional(),

  // Trajets
  departureAddress: z.string().min(5, "L'adresse de départ est requise"),
  departureLatitude: z.number().optional(),
  departureLongitude: z.number().optional(),
  arrivalAddress: z.string().min(5, "L'adresse d'arrivée est requise"),
  arrivalLatitude: z.number().optional(),
  arrivalLongitude: z.number().optional(),

  // Points intermédiaires
  intermediatePoints: z
    .array(
      z.object({
        address: z.string().min(3, "Adresse requise"),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        radius: z.number().min(1).max(50).default(5), // Rayon en km
       }),
    )
    .default([]),

  // Horaires
  departureDate: z.string().optional(),
  departureTimeWindow: z.string().optional(),
  arrivalDate: z.string().optional(),
  arrivalTimeWindow: z.string().optional(),

  // Récurrence
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number()).default([]),
  recurringEndDate: z.string().optional(),

  // Capacités
  maxWeight: z.number().min(0).default(20),
  maxVolume: z.number().min(0).optional(),
  availableSeats: z.number().min(0).max(8).default(0),

  // Types de colis acceptés
  acceptsFragile: z.boolean().default(true),
  acceptsCooling: z.boolean().default(false),
  acceptsLiveAnimals: z.boolean().default(false),
  acceptsOversized: z.boolean().default(false),

  // Notifications et matching
  enableNotifications: z.boolean().default(true),
  autoMatch: z.boolean().default(true),
  minMatchDistance: z.number().min(1).max(50).default(10),
  maxDetour: z.number().min(0).max(100).default(20), // % de détour accepté

  // Prix et conditions
  pricePerKm: z.number().min(0.1).max(5).default(0.5),
  fixedPrice: z.number().min(0).optional(),
  isNegotiable: z.boolean().default(true),

  // Préférences
  preferredClientTypes: z.array(z.string()).default([]),
  specialInstructions: z.string().optional()});

type RouteAnnouncementFormData = z.infer<typeof routeAnnouncementSchema>;

interface RouteAnnouncementFormProps {
  defaultValues?: Partial<RouteAnnouncementFormData>;
  onSubmit: (data: RouteAnnouncementFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  error?: string;
  mode?: "create" | "edit";
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" }];

const CLIENT_TYPES = [
  { value: "INDIVIDUAL", label: "Particuliers" },
  { value: "MERCHANT", label: "Commerçants" },
  { value: "COMPANY", label: "Entreprises" },
  { value: "VERIFIED_ONLY", label: "Comptes vérifiés uniquement" }];

export const RouteAnnouncementForm: React.FC<RouteAnnouncementFormProps> = ({ defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  mode = "create" }) => {
  const t = useTranslations("routes");
  const [activeTab, setActiveTab] = useState("route");

  const form = useForm<RouteAnnouncementFormData>({
    resolver: zodResolver(routeAnnouncementSchema),
    defaultValues: {
      title: "",
      description: "",
      departureAddress: "",
      arrivalAddress: "",
      intermediatePoints: [],
      maxWeight: 20,
      availableSeats: 0,
      acceptsFragile: true,
      acceptsCooling: false,
      acceptsLiveAnimals: false,
      acceptsOversized: false,
      enableNotifications: true,
      autoMatch: true,
      minMatchDistance: 10,
      maxDetour: 20,
      pricePerKm: 0.5,
      isNegotiable: true,
      preferredClientTypes: [],
      isRecurring: false,
      recurringDays: [],
      ...defaultValues}});

  const isRecurring = form.watch("isRecurring");
  const enableNotifications = form.watch("enableNotifications");
  const intermediatePoints = form.watch("intermediatePoints");

  const handleSubmit = async (values: RouteAnnouncementFormData) => {
    await onSubmit(values);
  };

  const addIntermediatePoint = () => {
    const currentPoints = form.getValues("intermediatePoints");
    form.setValue("intermediatePoints", [
      ...currentPoints,
      { address: "", latitude: undefined, longitude: undefined, radius: 5 }]);
  };

  const removeIntermediatePoint = (index: number) => {
    const currentPoints = form.getValues("intermediatePoints");
    form.setValue(
      "intermediatePoints",
      currentPoints.filter((_, i) => i !== index),
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "create" ? t("announceRoute") : t("editRoute")}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? t("announceRouteDescription")
                : t("editRouteDescription")}
            </CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardContent className="p-6 pb-0">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="route">
                  <Route className="h-4 w-4 mr-2" />
                  {t("route")}
                </TabsTrigger>
                <TabsTrigger value="schedule">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("schedule")}
                </TabsTrigger>
                <TabsTrigger value="capacity">
                  <MapPin className="h-4 w-4 mr-2" />
                  {t("capacity")}
                </TabsTrigger>
                <TabsTrigger value="matching">
                  <Bell className="h-4 w-4 mr-2" />
                  {t("matching")}
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="route" className="mt-0 space-y-6">
                {/* Informations générales */}
                <div className="space-y-4">
                  <Controller
                    control={form.control}
                    name="title"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("routeTitle")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("routeTitlePlaceholder")}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("routeTitleDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("routeDescription")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("routeDescriptionPlaceholder")}
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Adresses */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">{t("routeDetails")}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Controller
                      control={form.control}
                      name="departureAddress"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("departureAddress")}</FormLabel>
                          <FormControl>
                            <AddressMapPicker
                              address={field.value}
                              onAddressChange={(address) => {
                                form.setValue("departureAddress", address);
                              }}
                              onCoordinatesChange={(lat, lng) => {
                                form.setValue("departureLatitude", lat);
                                form.setValue("departureLongitude", lng);
                              }}
                              latitude={form.getValues("departureLatitude")}
                              longitude={form.getValues("departureLongitude")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="arrivalAddress"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("arrivalAddress")}</FormLabel>
                          <FormControl>
                            <AddressMapPicker
                              address={field.value}
                              onAddressChange={(address) => {
                                form.setValue("arrivalAddress", address);
                              }}
                              onCoordinatesChange={(lat, lng) => {
                                form.setValue("arrivalLatitude", lat);
                                form.setValue("arrivalLongitude", lng);
                              }}
                              latitude={form.getValues("arrivalLatitude")}
                              longitude={form.getValues("arrivalLongitude")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Points intermédiaires */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium">
                        {t("intermediatePoints")}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIntermediatePoint}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t("addPoint")}
                      </Button>
                    </div>

                    {intermediatePoints.map((point, index) => (
                      <div
                        key={index}
                        className="flex items-end space-x-2 p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Controller
                            control={form.control}
                            name={`intermediatePoints.${index}.address`}
                            render={({ field  }) => (
                              <FormItem>
                                <FormLabel>{t("pointAddress")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t("pointAddressPlaceholder")}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="w-24">
                          <Controller
                            control={form.control}
                            name={`intermediatePoints.${index}.radius`}
                            render={({ field  }) => (
                              <FormItem>
                                <FormLabel>{t("radius")} (km)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="1"
                                    max="50"
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeIntermediatePoint(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {intermediatePoints.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t("noIntermediatePoints")}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 space-y-6">
                {/* Récurrence */}
                <div className="space-y-4">
                  <Controller
                    control={form.control}
                    name="isRecurring"
                    render={({ field  }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t("recurringRoute")}
                          </FormLabel>
                          <FormDescription>
                            {t("recurringRouteDescription")}
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

                  {isRecurring && (
                    <>
                      <Controller
                        control={form.control}
                        name="recurringDays"
                        render={({ field  }) => (
                          <FormItem>
                            <FormLabel>{t("recurringDays")}</FormLabel>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <FormItem
                                  key={day.value}
                                  className="flex items-center space-x-2 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        const updatedDays = checked
                                          ? [...(field.value || []), day.value]
                                          : (field.value || []).filter(
                                              (d) => d !== day.value,
                                            );
                                        field.onChange(updatedDays);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {day.label}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name="recurringEndDate"
                        render={({ field  }) => (
                          <FormItem>
                            <FormLabel>{t("recurringEndDate")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("recurringEndDateDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                {/* Horaires spécifiques */}
                {!isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Controller
                      control={form.control}
                      name="departureDate"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("departureDate")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="datetime-local"
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="arrivalDate"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("arrivalDate")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="datetime-local"
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="capacity" className="mt-0 space-y-6">
                {/* Capacités */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {t("vehicleCapacity")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Controller
                      control={form.control}
                      name="maxWeight"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("maxWeight")} (kg)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="1000"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="maxVolume"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("maxVolume")} (L)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="availableSeats"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("availableSeats")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="8"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Types de colis acceptés */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {t("acceptedPackageTypes")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="acceptsFragile"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t("acceptsFragile")}</FormLabel>
                            <FormDescription>
                              {t("acceptsFragileDescription")}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="acceptsCooling"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t("acceptsCooling")}</FormLabel>
                            <FormDescription>
                              {t("acceptsCoolingDescription")}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="acceptsLiveAnimals"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t("acceptsLiveAnimals")}</FormLabel>
                            <FormDescription>
                              {t("acceptsLiveAnimalsDescription")}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="acceptsOversized"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t("acceptsOversized")}</FormLabel>
                            <FormDescription>
                              {t("acceptsOversizedDescription")}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="matching" className="mt-0 space-y-6">
                {/* Notifications et matching automatique */}
                <div className="space-y-4">
                  <Controller
                    control={form.control}
                    name="enableNotifications"
                    render={({ field  }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {t("enableNotifications")}
                          </FormLabel>
                          <FormDescription>
                            {t("enableNotificationsDescription")}
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

                  {enableNotifications && (
                    <Controller
                      control={form.control}
                      name="autoMatch"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {t("autoMatch")}
                            </FormLabel>
                            <FormDescription>
                              {t("autoMatchDescription")}
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
                  )}
                </div>

                {/* Paramètres de matching */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {t("matchingSettings")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="minMatchDistance"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("minMatchDistance")} (km)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="50"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            {t("minMatchDistanceDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="maxDetour"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("maxDetour")} (%)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="100"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            {t("maxDetourDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Tarification */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t("pricing")}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="pricePerKm"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("pricePerKm")} (€/km)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="5"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="fixedPrice"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("fixedPrice")} (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            {t("fixedPriceDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Controller
                    control={form.control}
                    name="isNegotiable"
                    render={({ field  }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("isNegotiable")}</FormLabel>
                          <FormDescription>
                            {t("isNegotiableDescription")}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Préférences clients */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {t("clientPreferences")}
                  </h3>

                  <Controller
                    control={form.control}
                    name="preferredClientTypes"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("preferredClientTypes")}</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {CLIENT_TYPES.map((type) => (
                            <FormItem
                              key={type.value}
                              className="flex items-center space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type.value)}
                                  onCheckedChange={(checked) => {
                                    const updatedTypes = checked
                                      ? [...(field.value || []), type.value]
                                      : (field.value || []).filter(
                                          (t) => t !== type.value,
                                        );
                                    field.onChange(updatedTypes);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {type.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </div>
                        <FormDescription>
                          {t("preferredClientTypesDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="specialInstructions"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("specialInstructions")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("specialInstructionsPlaceholder")}
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </CardContent>

            <CardContent>
              <div className="flex justify-between pt-6">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    {t("cancel")}
                  </Button>
                )}

                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isSubmitting}
                  >
                    {t("reset")}
                  </Button>

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("submitting")}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {mode === "create"
                          ? t("announceRoute")
                          : t("updateRoute")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Tabs>
        </Card>
      </form>
    </Form>
  );
};

export default RouteAnnouncementForm;
