"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createServiceRequestSchema } from "@/features/services/schemas/service-request.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Scissors,
  Wrench,
  Heart,
  Users,
  BookOpen,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type CreateServiceRequestData = {
  title: string;
  description: string;
  type: string;
  location: {
    address: string;
    city: string;
    postalCode: string;
    floor?: string;
    accessCode?: string;
  };
  scheduledAt: string;
  duration: number;
  budget: number;
  isRecurring: boolean;
  frequency?: string;
  specificRequirements?: string;
  providerGender?: string;
  urgency: string;
  cleaningDetails?: {
    surfaceArea: number;
    rooms: number;
    bathrooms: number;
    hasBalcony: boolean;
    hasPets: boolean;
    hasChildren: boolean;
    tasks: string[];
  };
  gardeningDetails?: {
    gardenSize: number;
    gardenType: string;
    tasks: string[];
    hasTools: boolean;
  };
  petCareDetails?: {
    pets: Array<{
      name: string;
      type: string;
      breed?: string;
      age: number;
    }>;
    serviceType: string;
    hasYard: boolean;
  };
  handymanDetails?: {
    tasks: string[];
    complexity: string;
    materialsProvided: boolean;
  };
};

export function CreateServiceRequestForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("HOME_SERVICE");
  const router = useRouter();
  const t = useTranslations();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateServiceRequestData>({
    resolver: zodResolver(createServiceRequestSchema),
    defaultValues: {
      type: "HOME_SERVICE",
      urgency: "NORMAL",
      budget: 50,
      duration: 120,
      isRecurring: false,
      cleaningDetails: {
        rooms: 3,
        bathrooms: 1,
        hasBalcony: false,
        hasPets: false,
        hasChildren: false,
        tasks: ["DUSTING", "VACUUMING", "MOPPING"],
      },
    },
  });

  const currentType = watch("type");
  const isRecurring = watch("isRecurring");
  const duration = watch("duration");

  // Suggestion de budget basée sur le type et la durée
  const getSuggestedBudget = (type: string, duration: number) => {
    const rates = {
      HOME_SERVICE: 25, // €/heure
      PET_CARE: 15,
      PERSON_TRANSPORT: 20,
      AIRPORT_TRANSFER: 30,
      SHOPPING: 15,
      INTERNATIONAL_PURCHASE: 25,
      CART_DROP: 20,
      OTHER: 25,
    };

    const hourlyRate = rates[type as keyof typeof rates] || 25;
    return Math.ceil((duration / 60) * hourlyRate);
  };

  const onSubmit = async (data: CreateServiceRequestData) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/client/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "❌ Erreur",
          description: result.error || "Une erreur est survenue",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Demande créée",
        description: "Votre demande de service a été publiée avec succès",
      });

      router.push("/client/service-requests");
    } catch (err) {
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue lors de la création",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const serviceTypes = [
    {
      value: "HOME_SERVICE",
      label: "Services à domicile",
      icon: Home,
      description: "Ménage, jardinage, bricolage, cours particuliers",
      color: "bg-blue-500",
    },
    {
      value: "PET_CARE",
      label: "Garde d'animaux",
      icon: Heart,
      description: "Garde à domicile, promenades, soins",
      color: "bg-pink-500",
    },
    {
      value: "PERSON_TRANSPORT",
      label: "Transport de personnes",
      icon: Users,
      description: "Accompagnement, transport quotidien",
      color: "bg-green-500",
    },
    {
      value: "AIRPORT_TRANSFER",
      label: "Transfert aéroport",
      icon: Sparkles,
      description: "Transport vers/depuis l'aéroport",
      color: "bg-purple-500",
    },
    {
      value: "SHOPPING",
      label: "Courses",
      icon: ShoppingCart,
      description: "Courses sur mesure, achats",
      color: "bg-orange-500",
    },
    {
      value: "INTERNATIONAL_PURCHASE",
      label: "Achats internationaux",
      icon: BookOpen,
      description: "Import de produits",
      color: "bg-red-500",
    },
    {
      value: "CART_DROP",
      label: "Lâcher de chariot",
      icon: Wrench,
      description: "Livraison depuis magasin",
      color: "bg-yellow-500",
    },
    {
      value: "OTHER",
      label: "Autres services",
      icon: Scissors,
      description: "Services personnalisés",
      color: "bg-gray-500",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Type de service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🛠️ Type de service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label key={type.value} className="relative">
                    <input
                      {...register("type")}
                      type="radio"
                      value={type.value}
                      className="sr-only peer"
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setValue(
                          "budget",
                          getSuggestedBudget(e.target.value, duration),
                        );
                      }}
                    />
                    <div className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-green-300 transition-all duration-200 h-full">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">
                            {type.label}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>📝 Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Titre de la demande *
              </label>
              <Input
                {...register("title")}
                id="title"
                placeholder="Ex: Ménage complet appartement 3 pièces"
                className="w-full"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description détaillée *
              </label>
              <Textarea
                {...register("description")}
                id="description"
                rows={4}
                placeholder="Décrivez précisément vos besoins, contraintes particulières..."
                className="w-full"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adresse */}
        <Card>
          <CardHeader>
            <CardTitle>📍 Adresse du service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="location.address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Adresse complète *
              </label>
              <Textarea
                {...register("location.address")}
                id="location.address"
                rows={2}
                placeholder="Numéro, rue, avenue..."
                className="w-full"
              />
              {errors.location?.address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.location.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="location.city"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ville *
                </label>
                <Input
                  {...register("location.city")}
                  id="location.city"
                  placeholder="Paris"
                  className="w-full"
                />
                {errors.location?.city && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.location.city.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="location.postalCode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Code postal *
                </label>
                <Input
                  {...register("location.postalCode")}
                  id="location.postalCode"
                  placeholder="75001"
                  className="w-full"
                />
                {errors.location?.postalCode && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.location.postalCode.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="location.floor"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Étage (optionnel)
                </label>
                <Input
                  {...register("location.floor")}
                  id="location.floor"
                  placeholder="3ème étage"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="location.accessCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Code d'accès (optionnel)
              </label>
              <Input
                {...register("location.accessCode")}
                id="location.accessCode"
                placeholder="Code d'entrée, interphone..."
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Planning et budget */}
        <Card>
          <CardHeader>
            <CardTitle>📅 Planning et budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="scheduledAt"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date et heure souhaitées *
                </label>
                <Input
                  {...register("scheduledAt")}
                  type="datetime-local"
                  id="scheduledAt"
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                />
                {errors.scheduledAt && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.scheduledAt.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="duration"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Durée estimée (minutes) *
                </label>
                <Input
                  {...register("duration", {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const newDuration = parseInt(e.target.value) || 120;
                      setValue(
                        "budget",
                        getSuggestedBudget(currentType, newDuration),
                      );
                    },
                  })}
                  type="number"
                  step="30"
                  min="30"
                  max="480"
                  id="duration"
                  className="w-full"
                />
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="budget"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Budget proposé (€) *
                </label>
                <Input
                  {...register("budget", { valueAsNumber: true })}
                  type="number"
                  step="5"
                  min="10"
                  max="5000"
                  id="budget"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Suggéré: {getSuggestedBudget(currentType, duration)}€
                </p>
                {errors.budget && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.budget.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="urgency"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Urgence
                </label>
                <select
                  {...register("urgency")}
                  id="urgency"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="LOW">Pas pressé</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Urgent</option>
                  <option value="URGENT">Très urgent</option>
                </select>
              </div>
            </div>

            {/* Service récurrent */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  {...register("isRecurring")}
                  type="checkbox"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Service récurrent
                </span>
              </label>

              {isRecurring && (
                <select
                  {...register("frequency")}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="WEEKLY">Hebdomadaire</option>
                  <option value="BIWEEKLY">Toutes les 2 semaines</option>
                  <option value="MONTHLY">Mensuel</option>
                  <option value="QUARTERLY">Trimestriel</option>
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Préférences prestataire */}
        <Card>
          <CardHeader>
            <CardTitle>👤 Préférences prestataire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="providerGender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Préférence de genre
              </label>
              <select
                {...register("providerGender")}
                id="providerGender"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="NO_PREFERENCE">Aucune préférence</option>
                <option value="FEMALE">Femme</option>
                <option value="MALE">Homme</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="specificRequirements"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Exigences particulières
              </label>
              <Textarea
                {...register("specificRequirements")}
                id="specificRequirements"
                rows={3}
                placeholder="Allergies, contraintes horaires, matériel spécifique..."
                className="w-full"
              />
              {errors.specificRequirements && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.specificRequirements.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Boutons */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Création en cours..." : "Publier la demande"}
          </Button>
        </div>
      </form>
    </div>
  );
}
