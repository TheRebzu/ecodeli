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
import { StorageBoxesMap } from '@/components/maps/storage-boxes-map';

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
    value: "SHOPPING",
    label: "Livraison de courses",
    description: "Livraison de courses et achats en ligne",
    icon: ShoppingCart,
    color: "bg-orange-500",
  },
  {
    value: "INTERNATIONAL_PURCHASE",
    label: "Achat international",
    description: "Achat de produits en ligne depuis l'étranger",
    icon: Globe,
    color: "bg-red-500",
  },
  {
    value: "CART_DROP",
    label: "Lâcher de chariot",
    description: "Livraison de colis déposés dans un entrepôt",
    icon: ShoppingCartIcon,
    color: "bg-indigo-500",
  },
];

// Ajout d'un type local pour le formulaire client (tous les types affichés)
type ClientAnnouncementType =
  | "PACKAGE_DELIVERY"
  | "PERSON_TRANSPORT"
  | "AIRPORT_TRANSFER"
  | "HOME_SERVICE"
  | "PET_SITTING"
  | "SHOPPING"
  | "INTERNATIONAL_PURCHASE"
  | "CART_DROP";

type CreateAnnouncementFormInput = {
  title: string;
  description: string;
  type: ClientAnnouncementType;
  deliveryType: "FULL" | "FINAL" | "PARTIAL";
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate?: string;
  deliveryDate?: string;
  isFlexibleDate?: boolean;
  basePrice?: number;
  currency?: string;
  isPriceNegotiable?: boolean;
  isUrgent?: boolean;
  requiresInsurance?: boolean;
  allowsPartialDelivery?: boolean;
  packageDetails?: any;
  specialInstructions?: string;
  customerNotes?: string;
  warehouseId?: string; // Ajouté pour FINAL
  cartDropDetails?: {
    storeName?: string;
    deliveryZone?: string;
    orderValue?: number;
  };
};

// Exemple de liste statique d'entrepôts/box utilisateur (à remplacer par un fetch réel plus tard)
const userWarehouses = [
  { id: 'w1', name: 'Box Paris Nord', address: '110 rue de Flandre, Paris' },
  { id: 'w2', name: 'Box Lyon Centre', address: '12 rue de la République, Lyon' },
];

export function CreateAnnouncementForm({
  onSuccess,
  initialData,
}: CreateAnnouncementFormProps) {
  console.log('CreateAnnouncementForm mounted');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ClientAnnouncementType>(
    "PACKAGE_DELIVERY"
  );
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CreateAnnouncementFormInput>({
    // Pas de resolver ici, validation côté API uniquement pour éviter les conflits de typage
    defaultValues: {
      title: "",
      description: "",
      type: "PACKAGE_DELIVERY", // ClientAnnouncementType uniquement
      deliveryType: "FULL", // 'FULL' ou 'FINAL' uniquement
      pickupAddress: "",
      deliveryAddress: "",
      pickupDate: new Date().toISOString(),
      deliveryDate: undefined,
      isFlexibleDate: false,
      basePrice: 0,
      currency: "EUR",
      isPriceNegotiable: false,
      isUrgent: false,
      requiresInsurance: false,
      allowsPartialDelivery: false,
      packageDetails: undefined,
      specialInstructions: "",
      customerNotes: "",
      warehouseId: undefined, // Initialisé pour le mode FINAL
      cartDropDetails: undefined, // Initialisé pour le type CART_DROP
      ...initialData,
    },
  });

  // DEBUG: Afficher tous les champs du formulaire à chaque rendu
  console.log("form values:", form.getValues());

  // Synchroniser selectedType avec la valeur du formulaire
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type" && value.type) {
        setSelectedType(value.type as ClientAnnouncementType);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Ajout d'un effet pour logger la valeur de deliveryType à chaque changement
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "deliveryType") {
        console.log("[DEBUG] deliveryType changed:", value.deliveryType);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // DEBUG: Afficher la valeur de deliveryType à chaque rendu
  console.log("deliveryType:", form.watch("deliveryType"));

  const onSubmit = async (data: CreateAnnouncementFormInput) => {
    setIsLoading(true);
    try {
      // Préparer les données pour l'API
      const processedData = {
        ...data,
        type: data.type as CreateAnnouncementInput["type"],
        packageDetails:
          data.type === "PACKAGE_DELIVERY" ? data.packageDetails : undefined,
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
              {/* Sélection du type de service */}
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
                              setSelectedType(type.value as ClientAnnouncementType);
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

              {/* Sélection du type de prise en charge */}
              <FormField
                control={form.control}
                name="deliveryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de prise en charge</FormLabel>
                    <FormControl>
                      <select
                        className="input input-bordered w-full"
                        value={field.value || "FULL"}
                        onChange={e => {
                          field.onChange(e.target.value as 'FULL' | 'FINAL' | 'PARTIAL');
                          form.setValue('deliveryType', e.target.value as 'FULL' | 'FINAL' | 'PARTIAL');
                        }}
                      >
                        <option value="FULL">Prise en charge intégrale (Point A → Point B directement)</option>
                        <option value="FINAL">Livraison finale (Depuis entrepôt → destinataire)</option>
                        <option value="PARTIAL">Livraison partielle (Point A → Point B)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Affichage conditionnel selon deliveryType */}
              {form.watch("deliveryType") === "FULL" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse de départ</FormLabel>
                        <FormControl>
                          <Input placeholder="123 rue de la Paix" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de départ</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
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
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse d'arrivée</FormLabel>
                        <FormControl>
                          <Input placeholder="456 avenue de la République" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'arrivée</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
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
                </div>
              )}

              {form.watch("deliveryType") === "FINAL" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sélection de l'entrepôt */}
                  <FormField
                    control={form.control}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrepôt de départ</FormLabel>
                        <FormControl>
                          <select
                            className="input input-bordered w-full"
                            value={field.value || ""}
                            onChange={e => {
                              field.onChange(e.target.value);
                            }}
                          >
                            <option value="">Sélectionnez un entrepôt</option>
                            {userWarehouses.map((w) => (
                              <option key={w.id} value={w.id}>{w.name} - {w.address}</option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse d'arrivée</FormLabel>
                        <FormControl>
                          <Input placeholder="456 avenue de la République" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'arrivée</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
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
                </div>
              )}

              {/* Le reste du formulaire (prix, description, options, etc.) reste inchangé */}

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
                  name="basePrice"
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

              {/* Date et options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isFlexibleDate"
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

                <FormField
                  control={form.control}
                  name="isUrgent"
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

              {/* Détails spécifiques pour Lâcher de chariot (CART_DROP) */}
              {selectedType === "CART_DROP" && (
                <Card className="p-4 bg-indigo-50 border-indigo-200">
                  <h3 className="font-semibold mb-3">🛒 Détails du lâcher de chariot</h3>
                  <FormField
                    control={form.control}
                    name="cartDropDetails.storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du magasin</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Super U, Auchan..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cartDropDetails.deliveryZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone de livraison</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Paris 19e, Lyon centre..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cartDropDetails.orderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur de la commande (€)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    {form.watch("isUrgent") && (
                      <Badge variant="destructive">🚨 URGENTE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {form.watch("pickupAddress")} →{" "}
                    {form.watch("deliveryAddress")} • {form.watch("basePrice")}€
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
