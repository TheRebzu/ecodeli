"use client";

import { useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Package,
  CreditCard,
  Save,
  Loader2,
  CornerDownLeft} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils/common";

import { AnnouncementPhotoUpload } from "@/components/shared/announcements/announcement-photo-upload";
import { AddressMapPicker } from "@/components/shared/announcements/address-map-picker";

import {
  AnnouncementTypeEnum,
  AnnouncementPriorityEnum,
  type AnnouncementType} from "@/schemas/delivery/announcement.schema";

// Schéma pour le formulaire (simplifié pour correspondre au schéma du backend)
const formSchema = z.object({ title: z
    .string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères"),
  type: z.string(),
  priority: z.string().default("MEDIUM"),
  pickupAddress: z.string().min(5, "L'adresse de collecte est requise"),
  pickupLongitude: z.number().optional(),
  pickupLatitude: z.number().optional(),
  deliveryAddress: z.string().min(5, "L'adresse de livraison est requise"),
  deliveryLongitude: z.number().optional(),
  deliveryLatitude: z.number().optional(),
  weight: z.preprocess(
    (val) => (val === "" ? undefined : Number(String(val).replace(",", "."))),
    z.number().positive().optional(),
  ),
  width: z.preprocess(
    (val) => (val === "" ? undefined : Number(String(val).replace(",", "."))),
    z.number().positive().optional(),
  ),
  height: z.preprocess(
    (val) => (val === "" ? undefined : Number(String(val).replace(",", "."))),
    z.number().positive().optional(),
  ),
  length: z.preprocess(
    (val) => (val === "" ? undefined : Number(String(val).replace(",", "."))),
    z.number().positive().optional(),
  ),
  isFragile: z.boolean().default(false),
  needsCooling: z.boolean().default(false),
  pickupDate: z.string().optional(),
  pickupTimeWindow: z.string().optional(),
  deliveryDate: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  isFlexible: z.boolean().default(false),
  suggestedPrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(String(val).replace(",", "."))),
    z.number().positive("Le prix proposé doit être supérieur à 0").optional(),
  ),
  isNegotiable: z.boolean().default(true),
  requiresSignature: z.boolean().default(false),
  requiresId: z.boolean().default(false),
  specialInstructions: z.string().optional(),
  photos: z.array(z.string()).default([]),

  // Champs pour livraison partielle
  intermediatePointAddress: z.string().optional(),
  intermediatePointLatitude: z.number().optional(),
  intermediatePointLongitude: z.number().optional(),

  // Champs pour lâcher de chariot
  cartDropSlot: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number()).optional(),

  // Assurance et abonnement
  insuranceRequired: z.boolean().default(false),
  priorityDelivery: z.boolean().default(false) });

// Types pour les props du formulaire
interface AnnouncementFormProps {
  defaultValues?: Partial<z.infer<typeof formSchema>>;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  error?: string;
  mode?: "create" | "edit";
}

// Type pour les valeurs du formulaire
type FormValues = z.infer<typeof formSchema>;

// Types d'annonce disponibles
const ANNOUNCEMENT_TYPES = [
  { value: "PACKAGE_DELIVERY", label: "Livraison de colis", icon: "Package" },
  {
    value: "PARTIAL_DELIVERY",
    label: "Livraison partielle",
    icon: "GitBranch"},
  { value: "FINAL_DISTRIBUTION", label: "Distribution finale", icon: "Target" },
  { value: "CART_DROP", label: "Lâcher de chariot", icon: "ShoppingCart" },
  {
    value: "GROCERY_SHOPPING",
    label: "Courses alimentaires",
    icon: "ShoppingBag"},
  { value: "PERSON_TRANSPORT", label: "Transport de personnes", icon: "Users" },
  { value: "AIRPORT_TRANSFER", label: "Transfert aéroport", icon: "Plane" },
  { value: "FOREIGN_PURCHASE", label: "Achat à l'étranger", icon: "Globe" },
  { value: "PET_CARE", label: "Transport d'animaux", icon: "Heart" },
  { value: "HOME_SERVICES", label: "Services à domicile", icon: "Home" }];

// Niveaux de priorité
const PRIORITY_LEVELS = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Élevée" },
  { value: "URGENT", label: "Urgente" }];

/**
 * Formulaire de création/modification d'annonce
 */
export function AnnouncementForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  mode = "create"}: AnnouncementFormProps) {
  const t = useTranslations("announcements");
  const [activeTab, setActiveTab] = useState("details");

  // Initialisation du formulaire avec react-hook-form et zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      type: "PACKAGE_DELIVERY",
      priority: "MEDIUM",
      pickupAddress: "",
      pickupLatitude: undefined,
      pickupLongitude: undefined,
      deliveryAddress: "",
      deliveryLatitude: undefined,
      deliveryLongitude: undefined,
      weight: undefined,
      width: undefined,
      height: undefined,
      length: undefined,
      isFragile: false,
      needsCooling: false,
      pickupDate: "",
      pickupTimeWindow: "",
      deliveryDate: "",
      deliveryTimeWindow: "",
      isFlexible: false,
      suggestedPrice: undefined,
      isNegotiable: true,
      requiresSignature: false,
      requiresId: false,
      specialInstructions: "",
      photos: [],
      ...defaultValues}});

  // Surveiller certaines valeurs du formulaire pour la logique conditionnelle
  const currentType = form.watch("type");
  const isFlexible = form.watch("isFlexible");

  // Gérer l'envoi du formulaire
  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    // Les valeurs sont déjà correctement transformées grâce au prétraitement de Zod
    await onSubmit(values);
  };

  // Mettre à jour les coordonnées de l'adresse de collecte
  const handlePickupCoordinatesChange = (lat: number, lng: number) => {
    form.setValue("pickupLatitude", lat);
    form.setValue("pickupLongitude", lng);
  };

  // Mettre à jour les coordonnées de l'adresse de livraison
  const handleDeliveryCoordinatesChange = (lat: number, lng: number) => {
    form.setValue("deliveryLatitude", lat);
    form.setValue("deliveryLongitude", lng);
  };

  // Gérer les changements d'adresse de collecte
  const handlePickupAddressChange = (address: string) => {
    form.setValue("pickupAddress", address);
  };

  // Gérer les changements d'adresse de livraison
  const handleDeliveryAddressChange = (address: string) => {
    form.setValue("deliveryAddress", address);
  };

  // Vérifier si certains champs sont requis en fonction du type d'annonce
  const isPackageType =
    currentType === "PACKAGE_DELIVERY" || currentType === "GROCERY_SHOPPING";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "create"
                ? t("createAnnouncement")
                : t("editAnnouncement")}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? t("createAnnouncementDescription")
                : t("editAnnouncementDescription")}
            </CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardContent className="p-6 pb-0">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="details">
                  <Package className="h-4 w-4 mr-2" />
                  {t("details")}
                </TabsTrigger>
                <TabsTrigger value="addresses">
                  <MapPin className="h-4 w-4 mr-2" />
                  {t("addresses")}
                </TabsTrigger>
                <TabsTrigger value="photos">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("schedule")}
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="details" className="mt-0 space-y-6">
                {/* Informations de base */}
                <div className="space-y-4">
                  <Controller
                    control={form.control}
                    name="title"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("title")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("titlePlaceholder")}
                            maxLength={100}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("titleDescription")}
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
                        <FormLabel>{t("description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("descriptionPlaceholder")}
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormDescription>
                          {t("descriptionDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("type")}</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={field.disabled}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("selectType")} />
                              </SelectTrigger>
                              <SelectContent>
                                {ANNOUNCEMENT_TYPES.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            {t("typeDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="priority"
                      render={({ field  }) => (
                        <FormItem>
                          <FormLabel>{t("priority")}</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex space-x-2"
                              disabled={field.disabled}
                            >
                              {PRIORITY_LEVELS.map((priority) => (
                                <FormItem
                                  key={priority.value}
                                  className="flex items-center space-x-1 space-y-0"
                                >
                                  <FormControl>
                                    <RadioGroupItem
                                      value={priority.value}
                                      id={`priority-${priority.value}`}
                                    />
                                  </FormControl>
                                  <FormLabel
                                    htmlFor={`priority-${priority.value}`}
                                    className={cn(
                                      "text-xs font-normal cursor-pointer",
                                      priority.value === "LOW" &&
                                        "text-blue-500",
                                      priority.value === "MEDIUM" &&
                                        "text-green-500",
                                      priority.value === "HIGH" &&
                                        "text-amber-500",
                                      priority.value === "URGENT" &&
                                        "text-red-500",
                                    )}
                                  >
                                    {priority.label}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            {t("priorityDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Détails du colis */}
                {isPackageType && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-base font-medium">
                        {t("packageDetails")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Controller
                          control={form.control}
                          name="weight"
                          render={({
                            field: { onChange, value, ...field }}) => (
                            <FormItem>
                              <FormLabel>{t("weight")} (kg)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  inputMode="decimal"
                                  value={value ?? ""}
                                  onChange={(e) => onChange(e.target.value)}
                                  placeholder="0.5"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="width"
                          render={({
                            field: { onChange, value, ...field }}) => (
                            <FormItem>
                              <FormLabel>{t("width")} (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  inputMode="decimal"
                                  value={value ?? ""}
                                  onChange={(e) => onChange(e.target.value)}
                                  placeholder="20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="height"
                          render={({
                            field: { onChange, value, ...field }}) => (
                            <FormItem>
                              <FormLabel>{t("height")} (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  inputMode="decimal"
                                  value={value ?? ""}
                                  onChange={(e) => onChange(e.target.value)}
                                  placeholder="15"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="length"
                          render={({
                            field: { onChange, value, ...field }}) => (
                            <FormItem>
                              <FormLabel>{t("length")} (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  inputMode="decimal"
                                  value={value ?? ""}
                                  onChange={(e) => onChange(e.target.value)}
                                  placeholder="30"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller
                          control={form.control}
                          name="isFragile"
                          render={({ field  }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={field.disabled}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>{t("isFragile")}</FormLabel>
                                <FormDescription>
                                  {t("isFragileDescription")}
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="needsCooling"
                          render={({ field  }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={field.disabled}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>{t("needsCooling")}</FormLabel>
                                <FormDescription>
                                  {t("needsCoolingDescription")}
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Exigences spéciales */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-base font-medium">
                    {t("specialRequirements")}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="requiresSignature"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={field.disabled}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t("requiresSignature")}</FormLabel>
                            <FormDescription>
                              {t("requiresSignatureDescription")}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="requiresId"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={field.disabled}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t("requiresId")}</FormLabel>
                            <FormDescription>
                              {t("requiresIdDescription")}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

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
                        <FormDescription>
                          {t("specialInstructionsDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Prix */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-base font-medium">{t("pricing")}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="suggestedPrice"
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem>
                          <FormLabel>{t("suggestedPrice")} (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              inputMode="decimal"
                              value={value ?? ""}
                              onChange={(e) => onChange(e.target.value)}
                              placeholder="20.00"
                              className="w-full"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("suggestedPriceDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="isNegotiable"
                      render={({ field  }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={field.disabled}
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
                </div>
              </TabsContent>

              <TabsContent value="addresses" className="mt-0 space-y-6">
                {/* Adresse de collecte */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">
                    {t("pickupAddress")}
                  </h3>

                  <Controller
                    control={form.control}
                    name="pickupAddress"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("pickupAddressLabel")}</FormLabel>
                        <FormControl>
                          <AddressMapPicker
                            address={field.value}
                            onAddressChange={handlePickupAddressChange}
                            onCoordinatesChange={handlePickupCoordinatesChange}
                            latitude={form.getValues("pickupLatitude")}
                            longitude={form.getValues("pickupLongitude")}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("pickupAddressDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Adresse de livraison */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">
                    {t("deliveryAddress")}
                  </h3>

                  <Controller
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("deliveryAddressLabel")}</FormLabel>
                        <FormControl>
                          <AddressMapPicker
                            address={field.value}
                            onAddressChange={handleDeliveryAddressChange}
                            onCoordinatesChange={
                              handleDeliveryCoordinatesChange
                            }
                            latitude={form.getValues("deliveryLatitude")}
                            longitude={form.getValues("deliveryLongitude")}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("deliveryAddressDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="photos" className="mt-0 space-y-6">
                {/* Horaires */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">{t("schedule")}</h3>

                  <Controller
                    control={form.control}
                    name="isFlexible"
                    render={({ field  }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={field.disabled}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("isFlexible")}</FormLabel>
                          <FormDescription>
                            {t("isFlexibleDescription")}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Controller
                        control={form.control}
                        name="pickupDate"
                        render={({ field  }) => (
                          <FormItem>
                            <FormLabel>{t("pickupDate")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                min={new Date().toISOString().slice(0, 16)}
                                className="w-full"
                                disabled={isFlexible || field.disabled}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name="pickupTimeWindow"
                        render={({ field  }) => (
                          <FormItem>
                            <FormLabel>{t("pickupTimeWindow")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("pickupTimeWindowPlaceholder")}
                                disabled={isFlexible || field.disabled}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("timeWindowDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <Controller
                        control={form.control}
                        name="deliveryDate"
                        render={({ field  }) => (
                          <FormItem>
                            <FormLabel>{t("deliveryDate")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                min={new Date().toISOString().slice(0, 16)}
                                className="w-full"
                                disabled={isFlexible || field.disabled}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name="deliveryTimeWindow"
                        render={({ field  }) => (
                          <FormItem>
                            <FormLabel>{t("deliveryTimeWindow")}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("deliveryTimeWindowPlaceholder")}
                                disabled={isFlexible || field.disabled}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("timeWindowDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Photos */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-base font-medium">{t("photos")}</h3>

                  <Controller
                    control={form.control}
                    name="photos"
                    render={({ field  }) => (
                      <FormItem>
                        <FormLabel>{t("photosLabel")}</FormLabel>
                        <FormControl>
                          <AnnouncementPhotoUpload
                            photos={field.value}
                            onPhotosChange={field.onChange}
                            maxPhotos={5}
                            disabled={isSubmitting || field.disabled}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("photosDescription")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>

          <CardFooter className="flex justify-between p-6">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <CornerDownLeft className="h-4 w-4 mr-2" />
                {t("cancel")}
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                }}
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
                    {mode === "create" ? t("create") : t("update")}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

export default AnnouncementForm;
