"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Bell,
  Shield,
  Truck,
  Globe,
  CreditCard,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface DelivererSettings {
  notifications: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    soundEnabled: boolean;
    matchThreshold: number;
    maxDistance: number;
    minPrice: number;
  };
  privacy: {
    locationSharing: boolean;
    profileVisibility: boolean;
  };
  delivery: {
    autoAccept: boolean;
    maxDeliveriesPerDay: number;
    preferredVehicleType: string;
    workingHours: {
      start: string;
      end: string;
    };
  };
  language: string;
  timezone: string;
}

export default function DelivererSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DelivererSettings>({
    notifications: {
      pushEnabled: true,
      emailEnabled: false,
      soundEnabled: true,
      matchThreshold: 70,
      maxDistance: 5,
      minPrice: 10,
    },
    privacy: {
      locationSharing: true,
      profileVisibility: true,
    },
    delivery: {
      autoAccept: false,
      maxDeliveriesPerDay: 10,
      preferredVehicleType: "CAR",
      workingHours: {
        start: "08:00",
        end: "18:00",
      },
    },
    language: "fr",
    timezone: "Europe/Paris",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliverer/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/deliverer/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Paramètres sauvegardés avec succès");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (
    section: keyof DelivererSettings,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentification requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à cette page
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configurez vos préférences et paramètres de compte"
      >
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </PageHeader>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          <TabsTrigger value="delivery">Livraison</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Notifications push
                      </Label>
                      <p className="text-sm text-gray-600">
                        Recevoir des notifications sur votre appareil
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.pushEnabled}
                      onCheckedChange={(checked) =>
                        updateSettings("notifications", "pushEnabled", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Notifications email
                      </Label>
                      <p className="text-sm text-gray-600">
                        Recevoir des notifications par email
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailEnabled}
                      onCheckedChange={(checked) =>
                        updateSettings("notifications", "emailEnabled", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Sons de notification
                      </Label>
                      <p className="text-sm text-gray-600">
                        Activer les sons pour les notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.soundEnabled}
                      onCheckedChange={(checked) =>
                        updateSettings("notifications", "soundEnabled", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>
                      Seuil de correspondance minimum:{" "}
                      {settings.notifications.matchThreshold}%
                    </Label>
                    <Input
                      type="range"
                      min="50"
                      max="100"
                      value={settings.notifications.matchThreshold}
                      onChange={(e) =>
                        updateSettings(
                          "notifications",
                          "matchThreshold",
                          parseInt(e.target.value),
                        )
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>
                      Distance maximale: {settings.notifications.maxDistance}km
                    </Label>
                    <Input
                      type="range"
                      min="1"
                      max="20"
                      value={settings.notifications.maxDistance}
                      onChange={(e) =>
                        updateSettings(
                          "notifications",
                          "maxDistance",
                          parseInt(e.target.value),
                        )
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>
                      Prix minimum: {settings.notifications.minPrice}€
                    </Label>
                    <Input
                      type="range"
                      min="5"
                      max="100"
                      value={settings.notifications.minPrice}
                      onChange={(e) =>
                        updateSettings(
                          "notifications",
                          "minPrice",
                          parseInt(e.target.value),
                        )
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de confidentialité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      Partage de localisation
                    </Label>
                    <p className="text-sm text-gray-600">
                      Autoriser le partage de votre position pendant les
                      livraisons
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.locationSharing}
                    onCheckedChange={(checked) =>
                      updateSettings("privacy", "locationSharing", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      Visibilité du profil
                    </Label>
                    <p className="text-sm text-gray-600">
                      Rendre votre profil visible aux clients
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.profileVisibility}
                    onCheckedChange={(checked) =>
                      updateSettings("privacy", "profileVisibility", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">
                        Acceptation automatique
                      </Label>
                      <p className="text-sm text-gray-600">
                        Accepter automatiquement les livraisons correspondantes
                      </p>
                    </div>
                    <Switch
                      checked={settings.delivery.autoAccept}
                      onCheckedChange={(checked) =>
                        updateSettings("delivery", "autoAccept", checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxDeliveries">
                      Nombre maximum de livraisons par jour
                    </Label>
                    <Input
                      id="maxDeliveries"
                      type="number"
                      min="1"
                      max="20"
                      value={settings.delivery.maxDeliveriesPerDay}
                      onChange={(e) =>
                        updateSettings(
                          "delivery",
                          "maxDeliveriesPerDay",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleType">
                      Type de véhicule préféré
                    </Label>
                    <Select
                      value={settings.delivery.preferredVehicleType}
                      onValueChange={(value) =>
                        updateSettings(
                          "delivery",
                          "preferredVehicleType",
                          value,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAR">Voiture</SelectItem>
                        <SelectItem value="BIKE">Vélo</SelectItem>
                        <SelectItem value="SCOOTER">Scooter</SelectItem>
                        <SelectItem value="TRUCK">Camion</SelectItem>
                        <SelectItem value="WALKING">À pied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="startTime">Heure de début</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={settings.delivery.workingHours.start}
                      onChange={(e) =>
                        updateSettings("delivery", "workingHours", {
                          ...settings.delivery.workingHours,
                          start: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="endTime">Heure de fin</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={settings.delivery.workingHours.end}
                      onChange={(e) =>
                        updateSettings("delivery", "workingHours", {
                          ...settings.delivery.workingHours,
                          end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="language">Langue</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) =>
                      updateSettings("general", "language", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) =>
                      updateSettings("general", "timezone", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                      <SelectItem value="Europe/London">
                        Europe/London
                      </SelectItem>
                      <SelectItem value="Europe/Berlin">
                        Europe/Berlin
                      </SelectItem>
                      <SelectItem value="Europe/Madrid">
                        Europe/Madrid
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
