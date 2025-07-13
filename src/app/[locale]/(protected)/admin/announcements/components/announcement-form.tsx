"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  User,
  Plane,
  ShoppingCart,
  Globe,
  Heart,
  Home,
  Truck,
} from "lucide-react";

const announcementSchema = z.object({
  title: z.string().min(5, "Le titre doit faire au moins 5 caractères"),
  description: z
    .string()
    .min(20, "La description doit faire au moins 20 caractères"),
  type: z.enum([
    "PACKAGE_DELIVERY",
    "PERSON_TRANSPORT",
    "AIRPORT_TRANSFER",
    "SHOPPING",
    "INTERNATIONAL_PURCHASE",
    "PET_SITTING",
    "HOME_SERVICE",
    "CART_DROP",
  ]),
  basePrice: z.number().min(0, "Le prix doit être positif"),
  pickupAddress: z.string().min(10, "Adresse de récupération requise"),
  deliveryAddress: z.string().min(10, "Adresse de livraison requise"),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  isUrgent: z.boolean().default(false),
  isFlexibleDate: z.boolean().default(false),
  preferredTimeSlot: z.enum(["MORNING", "AFTERNOON", "EVENING"]).optional(),
  specialInstructions: z.string().optional(),
  internalNotes: z.string().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  announcement?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const typeConfig = {
  PACKAGE_DELIVERY: { label: "Transport de Colis", icon: Package },
  PERSON_TRANSPORT: { label: "Transport de Personne", icon: User },
  AIRPORT_TRANSFER: { label: "Transfert Aéroport", icon: Plane },
  SHOPPING: { label: "Courses", icon: ShoppingCart },
  INTERNATIONAL_PURCHASE: { label: "Achat International", icon: Globe },
  PET_SITTING: { label: "Garde d'Animaux", icon: Heart },
  HOME_SERVICE: { label: "Service à Domicile", icon: Home },
  CART_DROP: { label: "Lâcher de Chariot", icon: Truck },
};

export function AnnouncementForm({
  announcement,
  onSuccess,
  onCancel,
}: AnnouncementFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(
    announcement?.type || "PACKAGE_DELIVERY",
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema) as any,
    defaultValues: {
      title: announcement?.title || "",
      description: announcement?.description || "",
      type: announcement?.type || "PACKAGE_DELIVERY",
      basePrice: announcement?.basePrice || 0,
      pickupAddress: announcement?.pickupAddress || "",
      deliveryAddress: announcement?.deliveryAddress || "",
      pickupDate: announcement?.pickupDate
        ? new Date(announcement.pickupDate).toISOString().slice(0, 16)
        : "",
      deliveryDate: announcement?.deliveryDate
        ? new Date(announcement.deliveryDate).toISOString().slice(0, 16)
        : "",
      isUrgent: announcement?.isUrgent || false,
      isFlexibleDate: announcement?.isFlexibleDate || false,
      preferredTimeSlot: announcement?.preferredTimeSlot || "MORNING",
      specialInstructions: announcement?.specialInstructions || "",
      internalNotes: announcement?.internalNotes || "",
    },
  });

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      setLoading(true);

      const url = announcement
        ? `/api/admin/announcements/${announcement.id}`
        : "/api/admin/announcements";

      const method = announcement ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      onSuccess();
    } catch (error) {
      console.error("Erreur formulaire:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Titre de l'annonce"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type d'annonce *</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value);
                  setValue("type", value as any);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Description détaillée de l'annonce"
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Prix de base (€) *</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                {...register("basePrice", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.basePrice && (
                <p className="text-sm text-red-600">
                  {errors.basePrice.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTimeSlot">Créneau préféré</Label>
              <Select
                value={watch("preferredTimeSlot") || "MORNING"}
                onValueChange={(value) =>
                  setValue("preferredTimeSlot", value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MORNING">Matin</SelectItem>
                  <SelectItem value="AFTERNOON">Après-midi</SelectItem>
                  <SelectItem value="EVENING">Soirée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adresses */}
      <Card>
        <CardHeader>
          <CardTitle>Adresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Adresse de récupération *</Label>
            <Input
              id="pickupAddress"
              {...register("pickupAddress")}
              placeholder="Adresse complète de récupération"
            />
            {errors.pickupAddress && (
              <p className="text-sm text-red-600">
                {errors.pickupAddress.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Adresse de livraison *</Label>
            <Input
              id="deliveryAddress"
              {...register("deliveryAddress")}
              placeholder="Adresse complète de livraison"
            />
            {errors.deliveryAddress && (
              <p className="text-sm text-red-600">
                {errors.deliveryAddress.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dates et planning */}
      <Card>
        <CardHeader>
          <CardTitle>Dates et planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupDate">Date de récupération</Label>
              <Input
                id="pickupDate"
                type="datetime-local"
                {...register("pickupDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Date de livraison</Label>
              <Input
                id="deliveryDate"
                type="datetime-local"
                {...register("deliveryDate")}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isUrgent"
                {...register("isUrgent")}
                onCheckedChange={(checked) =>
                  setValue("isUrgent", checked as boolean)
                }
              />
              <Label htmlFor="isUrgent">Annonce urgente</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFlexibleDate"
                {...register("isFlexibleDate")}
                onCheckedChange={(checked) =>
                  setValue("isFlexibleDate", checked as boolean)
                }
              />
              <Label htmlFor="isFlexibleDate">Dates flexibles</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions et notes */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions et notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Instructions spéciales</Label>
            <Textarea
              id="specialInstructions"
              {...register("specialInstructions")}
              placeholder="Instructions particulières pour le livreur"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Notes internes (admin)</Label>
            <Textarea
              id="internalNotes"
              {...register("internalNotes")}
              placeholder="Notes internes pour l'administration"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Sauvegarde..." : announcement ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
