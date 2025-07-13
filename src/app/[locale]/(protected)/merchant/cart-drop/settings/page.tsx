"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Clock,
  MapPin,
  Settings2,
  Save,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

const cartDropConfigSchema = z.object({
  isActive: z.boolean(),
  deliveryZones: z.array(
    z.object({
      postalCode: z.string().min(5).max(5),
      deliveryFee: z.number().min(0),
      maxDistance: z.number().min(1).max(50).optional(),
    }),
  ),
  timeSlots: z.array(
    z.object({
      day: z.number().min(0).max(6),
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      isActive: z.boolean(),
    }),
  ),
  maxOrdersPerSlot: z.number().min(1).max(100),
  minOrderAmount: z.number().min(0).optional(),
  avgPreparationTime: z.number().min(5).max(120).optional(),
});

type CartDropConfig = z.infer<typeof cartDropConfigSchema>;

const DAYS_OF_WEEK = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export default function CartDropSettingsPage() {
  const t = useTranslations("merchant.cart-drop");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<CartDropConfig | null>(null);

  const form = useForm<CartDropConfig>({
    resolver: zodResolver(cartDropConfigSchema),
    defaultValues: {
      isActive: false,
      deliveryZones: [],
      timeSlots: [],
      maxOrdersPerSlot: 10,
      minOrderAmount: 0,
      avgPreparationTime: 30,
    },
  });

  // Charger la configuration existante
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/merchant/cart-drop/settings", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setConfig(data.config);
            form.reset(data.config);
          }
        }
      } catch (error) {
        console.error("Error fetching cart-drop config:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [form, toast]);

  // Sauvegarder la configuration
  const onSubmit = async (data: CartDropConfig) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/merchant/cart-drop/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConfig(result.config);
        toast({
          title: "Configuration sauvegardée",
          description: "Vos paramètres de lâcher de chariot ont été mis à jour",
          variant: "default",
        });
      } else {
        throw new Error(result.error || "Erreur de sauvegarde");
      }
    } catch (error) {
      console.error("Error saving cart-drop config:", error);
      toast({
        title: "Erreur de sauvegarde",
        description:
          error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Ajouter une zone de livraison
  const addDeliveryZone = () => {
    const zones = form.getValues("deliveryZones");
    form.setValue("deliveryZones", [
      ...zones,
      { postalCode: "", deliveryFee: 0, maxDistance: 10 },
    ]);
  };

  // Supprimer une zone de livraison
  const removeDeliveryZone = (index: number) => {
    const zones = form.getValues("deliveryZones");
    form.setValue(
      "deliveryZones",
      zones.filter((_, i) => i !== index),
    );
  };

  // Ajouter un créneau horaire
  const addTimeSlot = () => {
    const slots = form.getValues("timeSlots");
    form.setValue("timeSlots", [
      ...slots,
      { day: 1, startTime: "09:00", endTime: "18:00", isActive: true },
    ]);
  };

  // Supprimer un créneau horaire
  const removeTimeSlot = (index: number) => {
    const slots = form.getValues("timeSlots");
    form.setValue(
      "timeSlots",
      slots.filter((_, i) => i !== index),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lâcher de Chariot</h1>
          <p className="text-muted-foreground mt-2">
            Configurez votre service de livraison à domicile pour vos clients
          </p>
        </div>
        <Badge variant={config?.isActive ? "default" : "secondary"}>
          {config?.isActive ? "Actif" : "Inactif"}
        </Badge>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Activation du service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configuration générale
            </CardTitle>
            <CardDescription>
              Activez et configurez votre service de lâcher de chariot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Activer le service</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux clients de commander une livraison à domicile
                </p>
              </div>
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) =>
                  form.setValue("isActive", checked)
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxOrdersPerSlot">
                  Commandes max par créneau
                </Label>
                <Input
                  id="maxOrdersPerSlot"
                  type="number"
                  min={1}
                  max={100}
                  {...form.register("maxOrdersPerSlot", {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="minOrderAmount">Montant minimum (€)</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  min={0}
                  step={0.01}
                  {...form.register("minOrderAmount", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="avgPreparationTime">
                  Temps préparation (min)
                </Label>
                <Input
                  id="avgPreparationTime"
                  type="number"
                  min={5}
                  max={120}
                  {...form.register("avgPreparationTime", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zones de livraison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Zones de livraison
            </CardTitle>
            <CardDescription>
              Définissez les codes postaux et tarifs de livraison
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch("deliveryZones").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune zone de livraison configurée</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDeliveryZone}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une zone
                </Button>
              </div>
            ) : (
              <>
                {form.watch("deliveryZones").map((zone, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Code postal</Label>
                        <Input
                          placeholder="75001"
                          {...form.register(
                            `deliveryZones.${index}.postalCode`,
                          )}
                        />
                      </div>
                      <div>
                        <Label>Frais de livraison (€)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          {...form.register(
                            `deliveryZones.${index}.deliveryFee`,
                            { valueAsNumber: true },
                          )}
                        />
                      </div>
                      <div>
                        <Label>Distance max (km)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          {...form.register(
                            `deliveryZones.${index}.maxDistance`,
                            { valueAsNumber: true },
                          )}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeDeliveryZone(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDeliveryZone}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une zone
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Créneaux horaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Créneaux horaires
            </CardTitle>
            <CardDescription>
              Définissez vos heures de livraison par jour de la semaine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch("timeSlots").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun créneau horaire configuré</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTimeSlot}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un créneau
                </Button>
              </div>
            ) : (
              <>
                {form.watch("timeSlots").map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Jour</Label>
                        <select
                          className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                          {...form.register(`timeSlots.${index}.day`, {
                            valueAsNumber: true,
                          })}
                        >
                          {DAYS_OF_WEEK.map((day, dayIndex) => (
                            <option key={dayIndex} value={dayIndex}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Heure de début</Label>
                        <Input
                          type="time"
                          {...form.register(`timeSlots.${index}.startTime`)}
                        />
                      </div>
                      <div>
                        <Label>Heure de fin</Label>
                        <Input
                          type="time"
                          {...form.register(`timeSlots.${index}.endTime`)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.watch(`timeSlots.${index}.isActive`)}
                          onCheckedChange={(checked) =>
                            form.setValue(
                              `timeSlots.${index}.isActive`,
                              checked,
                            )
                          }
                        />
                        <Label>Actif</Label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeTimeSlot(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTimeSlot}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un créneau
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Message d'avertissement si service inactif */}
      {!form.watch("isActive") && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Service inactif</p>
            </div>
            <p className="text-yellow-700 mt-1">
              Le service de lâcher de chariot est actuellement désactivé.
              Activez-le pour permettre aux clients de commander des livraisons
              à domicile.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
