"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createServiceSchema,
  type CreateServiceInput,
} from "@/features/services/schemas/service.schema";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import {
  User,
  Users,
  Plane,
  Heart,
  Home,
  Wrench,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Save,
  Send,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type FormData = CreateServiceInput;

// Types de services à la personne selon le cahier des charges EcoDeli
const serviceTypes = [
  {
    value: "PERSON_TRANSPORT",
    label: "Transport de personnes",
    icon: Users,
    description: "Transport quotidien (médecin, travail, gare)",
    category: "TRANSPORT",
  },
  {
    value: "AIRPORT_TRANSFER",
    label: "Transfert aéroport",
    icon: Plane,
    description: "Navette aéroport au départ ou à l'arrivée",
    category: "TRANSPORT",
  },
  {
    value: "PET_CARE",
    label: "Garde d'animaux",
    icon: Heart,
    description: "Garde d'animaux de compagnie à domicile",
    category: "PET_SERVICES",
  },
  {
    value: "HOME_CLEANING",
    label: "Ménage à domicile",
    icon: Home,
    description: "Service de ménage et nettoyage",
    category: "HOME_CARE",
  },
  {
    value: "GARDENING",
    label: "Jardinage",
    icon: Home,
    description: "Entretien jardin et espaces verts",
    category: "MAINTENANCE",
  },
  {
    value: "HANDYMAN",
    label: "Bricolage",
    icon: Wrench,
    description: "Petits travaux ménagers et réparations",
    category: "MAINTENANCE",
  },
  {
    value: "TUTORING",
    label: "Cours particuliers",
    icon: GraduationCap,
    description: "Enseignement et formation à domicile",
    category: "EDUCATION",
  },
  {
    value: "BEAUTY",
    label: "Soins beauté",
    icon: Sparkles,
    description: "Soins esthétiques à domicile",
    category: "PERSONAL_CARE",
  },
  {
    value: "HEALTHCARE",
    label: "Soins à domicile",
    icon: User,
    description: "Assistance et soins de santé",
    category: "HOME_CARE",
  },
] as const;

const priceUnits = [
  { value: "FLAT", label: "Prix fixe" },
  { value: "HOURLY", label: "Par heure" },
  { value: "DAILY", label: "Par jour" },
] as const;

export default function CreateServicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("client.services");

  const [isLoading, setIsLoading] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      isUrgent: false,
      requiresCertification: false,
      allowsReschedule: true,
      priceUnit: "FLAT",
      basePrice: 50,
      estimatedDuration: 120,
      isFlexibleTime: false,
    },
  });

  const selectedType = watch("type");
  const selectedPriceUnit = watch("priceUnit");

  const onSubmit = async (data: FormData, isDraft = false) => {
    if (!user) return;

    setIsLoading(true);
    setSaveAsDraft(isDraft);

    try {
      console.log("📝 Envoi des données service:", data);

      const response = await fetch("/api/client/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Service créé:", result);

        // Redirection vers la page de services
        router.push(`/client/services/${result.service.id}`);
      } else {
        const error = await response.json();
        console.error("❌ Erreur API:", error);
        alert(`Erreur: ${error.error || "Impossible de créer le service"}`);
      }
    } catch (error) {
      console.error("❌ Erreur:", error);
      alert("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
      setSaveAsDraft(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = serviceTypes.find((t) => t.value === type);
    const IconComponent = typeConfig?.icon || User;
    return <IconComponent className="h-4 w-4" />;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour demander un service.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demander un service à la personne"
        description="Réservez une prestation de service à domicile"
        action={
          <Link href="/client/services">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux services
            </Button>
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit((data) => onSubmit(data, false))}
        className="space-y-6"
      >
        {/* Type de service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Type de service à la personne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceTypes.map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = field.value === type.value;

                    return (
                      <div
                        key={type.value}
                        className={`
                          p-4 border rounded-lg cursor-pointer transition-all
                          ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }
                        `}
                        onClick={() => {
                          field.onChange(type.value);
                          setValue("category", type.category);
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">{type.label}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {type.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.type && (
              <p className="text-red-500 text-sm mt-2">{errors.type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre du service *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Titre descriptif de votre demande"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Décrivez précisément le service souhaité..."
                rows={4}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="specialRequirements">Exigences spéciales</Label>
              <Textarea
                id="specialRequirements"
                {...register("specialRequirements")}
                placeholder="Qualifications requises, matériel nécessaire..."
                rows={2}
              />
              {errors.specialRequirements && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.specialRequirements.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Localisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Lieu d'intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="location.address">Adresse complète *</Label>
              <Input
                id="location.address"
                {...register("location.address")}
                placeholder="Adresse complète d'intervention"
                className={errors.location?.address ? "border-red-500" : ""}
              />
              {errors.location?.address && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.location.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location.city">Ville *</Label>
                <Input
                  id="location.city"
                  {...register("location.city")}
                  placeholder="Ville"
                  className={errors.location?.city ? "border-red-500" : ""}
                />
                {errors.location?.city && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.city.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="location.postalCode">Code postal *</Label>
                <Input
                  id="location.postalCode"
                  {...register("location.postalCode")}
                  placeholder="75000"
                  className={
                    errors.location?.postalCode ? "border-red-500" : ""
                  }
                />
                {errors.location?.postalCode && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.postalCode.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="accessInstructions">Instructions d'accès</Label>
              <Input
                id="accessInstructions"
                {...register("accessInstructions")}
                placeholder="Code porte, étage, instructions particulières..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Planning et tarification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scheduledDate">Date souhaitée *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  {...register("scheduledDate")}
                  min={new Date().toISOString().slice(0, 10)}
                  className={errors.scheduledDate ? "border-red-500" : ""}
                />
                {errors.scheduledDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.scheduledDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="startTime">Heure de début *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime")}
                  className={errors.startTime ? "border-red-500" : ""}
                />
                {errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="estimatedDuration">
                  Durée estimée (minutes) *
                </Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  step="30"
                  min="30"
                  max="480"
                  {...register("estimatedDuration", { valueAsNumber: true })}
                  className={errors.estimatedDuration ? "border-red-500" : ""}
                />
                {errors.estimatedDuration && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.estimatedDuration.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isFlexibleTime"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isFlexibleTime"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isFlexibleTime">Horaires flexibles</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Tarification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="basePrice">Prix proposé (€) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.5"
                  min="1"
                  max="1000"
                  {...register("basePrice", { valueAsNumber: true })}
                  className={errors.basePrice ? "border-red-500" : ""}
                />
                {errors.basePrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.basePrice.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="priceUnit">Unité de prix</Label>
                <Controller
                  name="priceUnit"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner l'unité" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceUnits.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isPriceNegotiable"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isPriceNegotiable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isPriceNegotiable">Prix négociable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isUrgent"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isUrgent"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isUrgent">
                  Demande urgente (+15% de frais)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="requiresCertification"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="requiresCertification"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="requiresCertification">
                  Certification requise
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">* Champs obligatoires</div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit((data) => onSubmit(data, true))()}
                  disabled={isLoading}
                >
                  {saveAsDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder brouillon
                    </>
                  )}
                </Button>

                <Button type="submit" disabled={isLoading || !isValid}>
                  {isLoading && !saveAsDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publier la demande
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
