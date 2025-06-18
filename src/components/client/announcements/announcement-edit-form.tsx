"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Package, Clock, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AnnouncementEditFormProps {
  announcementId: string;
  initialData?: any;
}

export default function AnnouncementEditForm({ announcementId, initialData }: AnnouncementEditFormProps) {
  const t = useTranslations("announcements.edit");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Formulaire state
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    pickupAddress: initialData?.pickupAddress || "",
    deliveryAddress: initialData?.deliveryAddress || "",
    packageType: initialData?.packageType || "",
    weight: initialData?.weight || "",
    dimensions: initialData?.dimensions || "",
    value: initialData?.value || "",
    pickupDate: initialData?.pickupDate ? new Date(initialData.pickupDate) : undefined,
    deliveryDate: initialData?.deliveryDate ? new Date(initialData.deliveryDate) : undefined,
    maxPrice: initialData?.maxPrice || "",
    urgencyLevel: initialData?.urgencyLevel || "NORMAL",
    specialInstructions: initialData?.specialInstructions || "",
  });

  // Mutation pour mettre à jour l'annonce
  const updateMutation = api.client.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      router.push(`/client/announcements/${announcementId}`);
    },
    onError: (error) => {
      toast.error(error.message || t("error"));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateMutation.mutateAsync({
        id: announcementId,
        ...formData,
        weight: parseFloat(formData.weight) || 0,
        value: parseFloat(formData.value) || 0,
        maxPrice: parseFloat(formData.maxPrice) || 0,
      });
    } catch (error) {
      console.error("Error updating announcement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("fields.title")} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder={t("placeholders.title")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageType">{t("fields.packageType")} *</Label>
              <Select
                value={formData.packageType}
                onValueChange={(value) => handleInputChange("packageType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.packageType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                  <SelectItem value="PACKAGE">Colis</SelectItem>
                  <SelectItem value="FRAGILE">Fragile</SelectItem>
                  <SelectItem value="FOOD">Alimentaire</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("fields.description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder={t("placeholders.description")}
              rows={3}
            />
          </div>

          {/* Adresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupAddress">{t("fields.pickupAddress")} *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={(e) => handleInputChange("pickupAddress", e.target.value)}
                  placeholder={t("placeholders.pickupAddress")}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">{t("fields.deliveryAddress")} *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
                  placeholder={t("placeholders.deliveryAddress")}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.pickupDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.pickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.pickupDate ? (
                      format(formData.pickupDate, "PPP", { locale: fr })
                    ) : (
                      t("placeholders.pickupDate")
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.pickupDate}
                    onSelect={(date) => handleInputChange("pickupDate", date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t("fields.deliveryDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deliveryDate ? (
                      format(formData.deliveryDate, "PPP", { locale: fr })
                    ) : (
                      t("placeholders.deliveryDate")
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deliveryDate}
                    onSelect={(date) => handleInputChange("deliveryDate", date)}
                    disabled={(date) => date < (formData.pickupDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Détails du colis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">{t("fields.weight")} (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="0.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dimensions">{t("fields.dimensions")}</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange("dimensions", e.target.value)}
                placeholder="L x l x h (cm)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">{t("fields.value")} (€)</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => handleInputChange("value", e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Prix et urgence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPrice">{t("fields.maxPrice")} (€)</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="maxPrice"
                  type="number"
                  step="0.01"
                  value={formData.maxPrice}
                  onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgencyLevel">{t("fields.urgencyLevel")}</Label>
              <Select
                value={formData.urgencyLevel}
                onValueChange={(value) => handleInputChange("urgencyLevel", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Faible</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">Élevé</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instructions spéciales */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">{t("fields.specialInstructions")}</Label>
            <Textarea
              id="specialInstructions"
              value={formData.specialInstructions}
              onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
              placeholder={t("placeholders.specialInstructions")}
              rows={3}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || updateMutation.isPending}>
              {(isLoading || updateMutation.isPending) ? t("actions.updating") : t("actions.update")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
