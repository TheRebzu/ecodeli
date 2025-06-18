"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import {
  Settings,
  Save,
  Mail,
  Shield,
  Database,
  Globe,
  Bell,
  CreditCard,
  Truck,
  MapPin,
  Clock,
  AlertTriangle} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportPhone: string;
    maintenanceMode: boolean;
    debugMode: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    allowedIpAddresses: string;
    rateLimitRequests: number;
  };
  payments: {
    stripePublicKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    paypalSecret: string;
    defaultCurrency: string;
    taxRate: number;
    commissionRate: number;
  };
  delivery: {
    defaultRadius: number;
    maxDeliveryDistance: number;
    baseDeliveryPrice: number;
    pricePerKm: number;
    estimatedDeliveryTime: number;
    enableRealTimeTracking: boolean;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enableSmsNotifications: boolean;
    enablePushNotifications: boolean;
    adminEmailAlerts: boolean;
    userWelcomeEmail: boolean;
    orderConfirmationEmail: boolean;
  };
}

interface AdminSettingsDashboardProps {
  locale?: string;
}

export default function AdminSettingsDashboard({ locale }: AdminSettingsDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Récupérer les paramètres via tRPC
  const {
    data: settingsData,
    isLoading,
    refetch} = api.admin.settings.getAll.useQuery();

  // État local pour les modifications
  const [settings, setSettings] = useState<SystemSettings>(
    settingsData || {
      general: {
        siteName: "EcoDeli",
        siteDescription: "Plateforme de livraison écologique",
        contactEmail: "contact@ecodeli.me",
        supportPhone: "+33 1 23 45 67 89",
        maintenanceMode: false,
        debugMode: false},
      email: {
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpUsername: "noreply@ecodeli.me",
        smtpPassword: "••••••••",
        smtpSecure: true,
        fromEmail: "noreply@ecodeli.me",
        fromName: "EcoDeli"},
      security: {
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        requireTwoFactor: false,
        allowedIpAddresses: "",
        rateLimitRequests: 100},
      payments: {
        stripePublicKey: "pk_test_••••••••",
        stripeSecretKey: "sk_test_••••••••",
        paypalClientId: "••••••••",
        paypalSecret: "••••••••",
        defaultCurrency: "EUR",
        taxRate: 20,
        commissionRate: 5},
      delivery: {
        defaultRadius: 10,
        maxDeliveryDistance: 50,
        baseDeliveryPrice: 5.99,
        pricePerKm: 0.5,
        estimatedDeliveryTime: 30,
        enableRealTimeTracking: true},
      notifications: {
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        enablePushNotifications: true,
        adminEmailAlerts: true,
        userWelcomeEmail: true,
        orderConfirmationEmail: true}},
  );

  // Mettre à jour l'état local quand les données arrivent
  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  const updateSettings = (
    section: keyof SystemSettings,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value}}));
    setUnsavedChanges(true);
  };

  const saveSettingsMutation =
    api.admin.settings.updateSystemSettings.useMutation({ onSuccess: () => {
        toast({
          title: "Paramètres sauvegardés",
          description: "Les paramètres système ont été mis à jour avec succès." });
        setUnsavedChanges(false);
      },
      onError: (error) => {
        toast({ title: "Erreur",
          description:
            error.message || "Erreur lors de la sauvegarde des paramètres.",
          variant: "destructive" });
      }});

  const saveSettings = async () => {
    try {
      await saveSettingsMutation.mutateAsync({ settings });
    } catch (error) {
      console.error("Erreur sauvegarde paramètres:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Chargement des paramètres système...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Paramètres Système
          </h1>
          <p className="text-muted-foreground">
            Configuration globale de la plateforme EcoDeli
          </p>
        </div>

        {unsavedChanges && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-600">
              Modifications non sauvegardées
            </span>
            <Button
              onClick={saveSettings}
              disabled={saveSettingsMutation.isPending}
              className="ml-2"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettingsMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Livraison
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Onglet Général */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Généraux</CardTitle>
              <CardDescription>
                Configuration de base de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) =>
                      updateSettings("general", "siteName", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de contact</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={settings.general.contactEmail}
                    onChange={(e) =>
                      updateSettings("general", "contactEmail", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Description du site</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) =>
                    updateSettings("general", "siteDescription", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportPhone">Téléphone support</Label>
                <Input
                  id="supportPhone"
                  value={settings.general.supportPhone}
                  onChange={(e) =>
                    updateSettings("general", "supportPhone", e.target.value)
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mode maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Active le mode maintenance pour tout le site
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.maintenanceMode}
                    onCheckedChange={(checked) =>
                      updateSettings("general", "maintenanceMode", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mode debug</Label>
                    <p className="text-sm text-muted-foreground">
                      Active les logs de débogage détaillés
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.debugMode}
                    onCheckedChange={(checked) =>
                      updateSettings("general", "debugMode", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Email */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Email</CardTitle>
              <CardDescription>
                Paramètres SMTP pour l'envoi d'emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={settings.email.smtpHost}
                    onChange={(e) =>
                      updateSettings("email", "smtpHost", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port SMTP</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) =>
                      updateSettings("email", "smtpPort", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">Nom d'utilisateur</Label>
                  <Input
                    id="smtpUsername"
                    value={settings.email.smtpUsername}
                    onChange={(e) =>
                      updateSettings("email", "smtpUsername", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Mot de passe</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.email.smtpPassword}
                    onChange={(e) =>
                      updateSettings("email", "smtpPassword", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Email expéditeur</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={settings.email.fromEmail}
                    onChange={(e) =>
                      updateSettings("email", "fromEmail", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromName">Nom expéditeur</Label>
                  <Input
                    id="fromName"
                    value={settings.email.fromName}
                    onChange={(e) =>
                      updateSettings("email", "fromName", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Connexion sécurisée</Label>
                  <p className="text-sm text-muted-foreground">
                    Utiliser SSL/TLS pour la connexion SMTP
                  </p>
                </div>
                <Switch
                  checked={settings.email.smtpSecure}
                  onCheckedChange={(checked) =>
                    updateSettings("email", "smtpSecure", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Sécurité */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Sécurité</CardTitle>
              <CardDescription>
                Configuration des mesures de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Timeout session (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) =>
                      updateSettings("security", "sessionTimeout", parseInt(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) =>
                      updateSettings("security", "maxLoginAttempts", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Longueur mot de passe min</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) =>
                      updateSettings("security", "passwordMinLength", parseInt(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateLimitRequests">Limite requêtes/minute</Label>
                  <Input
                    id="rateLimitRequests"
                    type="number"
                    value={settings.security.rateLimitRequests}
                    onChange={(e) =>
                      updateSettings("security", "rateLimitRequests", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowedIpAddresses">Adresses IP autorisées (admin)</Label>
                <Textarea
                  id="allowedIpAddresses"
                  placeholder="Laisser vide pour autoriser toutes les IP, une IP par ligne"
                  value={settings.security.allowedIpAddresses}
                  onChange={(e) =>
                    updateSettings("security", "allowedIpAddresses", e.target.value)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authentification à double facteur obligatoire</Label>
                  <p className="text-sm text-muted-foreground">
                    Exiger 2FA pour tous les utilisateurs administrateurs
                  </p>
                </div>
                <Switch
                  checked={settings.security.requireTwoFactor}
                  onCheckedChange={(checked) =>
                    updateSettings("security", "requireTwoFactor", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Paiements */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Paiements</CardTitle>
              <CardDescription>
                Paramètres des systèmes de paiement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Stripe</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripePublicKey">Clé publique Stripe</Label>
                    <Input
                      id="stripePublicKey"
                      value={settings.payments.stripePublicKey}
                      onChange={(e) =>
                        updateSettings("payments", "stripePublicKey", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripeSecretKey">Clé secrète Stripe</Label>
                    <Input
                      id="stripeSecretKey"
                      type="password"
                      value={settings.payments.stripeSecretKey}
                      onChange={(e) =>
                        updateSettings("payments", "stripeSecretKey", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">PayPal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paypalClientId">Client ID PayPal</Label>
                    <Input
                      id="paypalClientId"
                      value={settings.payments.paypalClientId}
                      onChange={(e) =>
                        updateSettings("payments", "paypalClientId", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paypalSecret">Secret PayPal</Label>
                    <Input
                      id="paypalSecret"
                      type="password"
                      value={settings.payments.paypalSecret}
                      onChange={(e) =>
                        updateSettings("payments", "paypalSecret", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Configuration générale</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Devise par défaut</Label>
                    <Select
                      value={settings.payments.defaultCurrency}
                      onValueChange={(value) =>
                        updateSettings("payments", "defaultCurrency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Taux TVA (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.1"
                      value={settings.payments.taxRate}
                      onChange={(e) =>
                        updateSettings("payments", "taxRate", parseFloat(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission plateforme (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      step="0.1"
                      value={settings.payments.commissionRate}
                      onChange={(e) =>
                        updateSettings("payments", "commissionRate", parseFloat(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Livraison */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Livraison</CardTitle>
              <CardDescription>
                Paramètres des services de livraison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultRadius">Rayon par défaut (km)</Label>
                  <Input
                    id="defaultRadius"
                    type="number"
                    value={settings.delivery.defaultRadius}
                    onChange={(e) =>
                      updateSettings("delivery", "defaultRadius", parseInt(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDeliveryDistance">Distance max livraison (km)</Label>
                  <Input
                    id="maxDeliveryDistance"
                    type="number"
                    value={settings.delivery.maxDeliveryDistance}
                    onChange={(e) =>
                      updateSettings("delivery", "maxDeliveryDistance", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseDeliveryPrice">Prix base livraison (€)</Label>
                  <Input
                    id="baseDeliveryPrice"
                    type="number"
                    step="0.01"
                    value={settings.delivery.baseDeliveryPrice}
                    onChange={(e) =>
                      updateSettings("delivery", "baseDeliveryPrice", parseFloat(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">Prix par km (€)</Label>
                  <Input
                    id="pricePerKm"
                    type="number"
                    step="0.01"
                    value={settings.delivery.pricePerKm}
                    onChange={(e) =>
                      updateSettings("delivery", "pricePerKm", parseFloat(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedDeliveryTime">Temps estimé (min)</Label>
                  <Input
                    id="estimatedDeliveryTime"
                    type="number"
                    value={settings.delivery.estimatedDeliveryTime}
                    onChange={(e) =>
                      updateSettings("delivery", "estimatedDeliveryTime", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Suivi en temps réel</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer le suivi GPS en temps réel des livraisons
                  </p>
                </div>
                <Switch
                  checked={settings.delivery.enableRealTimeTracking}
                  onCheckedChange={(checked) =>
                    updateSettings("delivery", "enableRealTimeTracking", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Notifications</CardTitle>
              <CardDescription>
                Paramètres des notifications système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications email</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer l'envoi de notifications par email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enableEmailNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "enableEmailNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer l'envoi de notifications par SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enableSmsNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "enableSmsNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications push</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer les notifications push sur mobile/web
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enablePushNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "enablePushNotifications", checked)
                    }
                  />
                </div>

                <Separator />

                <h4 className="text-lg font-medium">Notifications automatiques</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes administrateur</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des alertes email pour les événements critiques
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.adminEmailAlerts}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "adminEmailAlerts", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email de bienvenue</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoyer un email de bienvenue aux nouveaux utilisateurs
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.userWelcomeEmail}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "userWelcomeEmail", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmation de commande</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoyer une confirmation email pour chaque commande
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.orderConfirmationEmail}
                    onCheckedChange={(checked) =>
                      updateSettings("notifications", "orderConfirmationEmail", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions rapides en bas */}
      <div className="fixed bottom-6 right-6">
        {unsavedChanges && (
          <Button
            onClick={saveSettings}
            disabled={saveSettingsMutation.isPending}
            size="lg"
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveSettingsMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        )}
      </div>
    </div>
  );
} 