"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createAnnouncementSchema,
  type CreateAnnouncementInput,
} from "../../schemas/announcement.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Package,
  Users,
  Plane,
  ShoppingCart,
  Globe,
  Home,
  Heart,
  ShoppingCartIcon,
} from "lucide-react";

/**
 * Composant de création d'annonce pour clients EcoDeli
 * Mission 1 - Tous les types d'annonces selon cahier des charges
 */

interface CreateAnnouncementFormProps {
  onSuccess?: (announcementId: string) => void;
  initialData?: Partial<CreateAnnouncementInput>;
}

const announcementTypes = [
  {
    value: "PACKAGE_DELIVERY",
    label: "Transport de colis",
    description: "Livraison de colis (intégral ou partiel)",
    icon: Package,
    color: "bg-blue-500",
  },
  {
    value: "PERSON_TRANSPORT",
    label: "Transport de personnes",
    description: "Transport quotidien de personnes",
    icon: Users,
    color: "bg-green-500",
  },
  {
    value: "AIRPORT_TRANSFER",
    label: "Transfert aéroport",
    description: "Transport vers/depuis l'aéroport",
    icon: Plane,
    color: "bg-purple-500",
  },
  {
    value: "SHOPPING",
    label: "Courses",
    description: "Courses avec liste fournie au livreur",
    icon: ShoppingCart,
    color: "bg-orange-500",
  },
  {
    value: "INTERNATIONAL_PURCHASE",
    label: "Achats internationaux",
    description: "Achats depuis l'étranger",
    icon: Globe,
    color: "bg-red-500",
  },
  {
    value: "HOME_SERVICE",
    label: "Services à domicile",
    description: "Ménage, jardinage, bricolage...",
    icon: Home,
    color: "bg-yellow-500",
  },
  {
    value: "PET_SITTING",
    label: "Garde d'animaux",
    description: "Garde d'animaux à domicile",
    icon: Heart,
    color: "bg-pink-500",
  },
  {
    value: "CART_DROP",
    label: "Lâcher de chariot",
    description: "Livraison à domicile depuis magasin",
    icon: ShoppingCartIcon,
    color: "bg-indigo-500",
  },
];

export function CreateAnnouncementForm({
  onSuccess,
  initialData,
}: CreateAnnouncementFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("PACKAGE_DELIVERY");
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CreateAnnouncementInput>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "PACKAGE_DELIVERY" as any,
      price: 0,
      currency: "EUR",
      urgent: false,
      flexibleDates: false,
      desiredDate: new Date().toISOString().slice(0, 16),
      startLocation: {
        address: "",
        city: "",
        postalCode: "",
        country: "FR",
      },
      endLocation: {
        address: "",
        city: "",
        postalCode: "",
        country: "FR",
      },
      ...initialData,
    },
  });

  // Synchroniser selectedType avec la valeur du formulaire
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type" && value.type) {
        setSelectedType(value.type);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: CreateAnnouncementInput) => {
    setIsLoading(true);
    try {
      // Préparer les données pour l'API
      const processedData = {
        title: data.title,
        description: data.description,
        type: data.type,
        pickupAddress: data.startLocation?.address || "",
        deliveryAddress: data.endLocation?.address || "",
        basePrice: data.price || 0,
        price: data.price || 0,
        currency: data.currency || "EUR",
        urgent: data.urgent || false,
        isUrgent: data.urgent || false,
        requiresInsurance: data.requiresInsurance || false,
        specialInstructions: data.specialInstructions || "",
        // Convertir les dates si présentes
        desiredDate: data.desiredDate
          ? new Date(data.desiredDate).toISOString()
          : undefined,
        pickupDate: data.pickupDate
          ? new Date(data.pickupDate).toISOString()
          : undefined,
        deliveryDate: data.deliveryDate
          ? new Date(data.deliveryDate).toISOString()
          : undefined,
        // Détails du package si c'est une livraison de colis
        packageDetails:
          data.type === "PACKAGE_DELIVERY"
            ? {
                weight: data.packageDetails?.weight || 1,
                dimensions: `${data.packageDetails?.length || 0}x${data.packageDetails?.width || 0}x${data.packageDetails?.height || 0}cm`,
                fragile: data.packageDetails?.fragile || false,
                description: data.packageDetails?.content || "Colis standard",
              }
            : undefined,
      };

      console.log("Données envoyées à l'API:", processedData);

      const response = await fetch("/api/client/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Erreur API:", error);
        throw new Error(
          error.error || error.details || "Erreur lors de la création",
        );
      }

      const result = await response.json();

      toast({
        title: "✅ Annonce créée avec succès !",
        description:
          "Votre annonce est maintenant visible par nos livreurs et prestataires.",
        duration: 5000,
      });

      onSuccess?.(result.announcement.id);
      router.push(`/client/announcements/${result.announcement.id}`);
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({
        title: "❌ Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de créer l'annonce",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypeInfo = announcementTypes.find(
    (t) => t.value === selectedType,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📝 Créer une nouvelle annonce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Sélection du type d'annonce */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Type de service
                    </FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {announcementTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = field.value === type.value;
                        return (
                          <div
                            key={type.value}
                            className={`
                              p-4 border-2 rounded-lg cursor-pointer transition-all
                              ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }
                            `}
                            onClick={() => {
                              field.onChange(type.value);
                              setSelectedType(type.value);
                            }}
                          >
                            <div
                              className={`w-8 h-8 rounded-full ${type.color} flex items-center justify-center mb-2`}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-medium text-sm">
                              {type.label}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {type.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre de l'annonce</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Livraison urgente Paris-Lyon"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix proposé (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="25.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description détaillée</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez précisément votre demande, les contraintes, horaires préférés..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Adresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    📍 Adresse de départ
                  </h3>
                  <FormField
                    control={form.control}
                    name="startLocation.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse complète</FormLabel>
                        <FormControl>
                          <Input placeholder="123 rue de la Paix" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="startLocation.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Paris" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startLocation.postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="75001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    🎯 Adresse d'arrivée
                  </h3>
                  <FormField
                    control={form.control}
                    name="endLocation.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse complète</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="456 avenue de la République"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="endLocation.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Lyon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endLocation.postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="69000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Date et options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="desiredDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date souhaitée</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          onChange={(e) => {
                            // Convert to ISO string for validation
                            if (e.target.value) {
                              const date = new Date(e.target.value);
                              field.onChange(date.toISOString());
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="urgent"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          🚨 Annonce urgente (+20% de tarif)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flexibleDates"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          📅 Dates flexibles
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Détails spécifiques selon le type */}
              {selectedType === "PACKAGE_DELIVERY" && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h3 className="font-semibold mb-3">📦 Détails du colis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FormField
                      control={form.control}
                      name="packageDetails.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Poids (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="2.5"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="packageDetails.length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longueur (cm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="packageDetails.width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Largeur (cm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="packageDetails.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hauteur (cm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    <FormField
                      control={form.control}
                      name="packageDetails.content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contenu du colis</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Vêtements, livres, objets divers..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="packageDetails.fragile"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>🔸 Fragile</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="packageDetails.requiresInsurance"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>🛡️ Assurance requise</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Instructions spéciales */}
              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions spéciales (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Horaires d'accès, code d'entrée, consignes particulières..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Résumé et validation */}
              {selectedTypeInfo && (
                <Card className="p-4 bg-gray-50">
                  <h3 className="font-semibold mb-2">
                    📋 Résumé de votre annonce
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className={selectedTypeInfo.color}
                    >
                      {selectedTypeInfo.label}
                    </Badge>
                    {form.watch("urgent") && (
                      <Badge variant="destructive">🚨 URGENTE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {form.watch("startLocation.city")} →{" "}
                    {form.watch("endLocation.city")} • {form.watch("price")}€
                  </p>
                </Card>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>🔄 Création en cours...</>
                  ) : (
                    <>📝 Publier l'annonce</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
