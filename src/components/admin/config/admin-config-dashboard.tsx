"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Mail, 
  CreditCard, 
  Shield, 
  Bell,
  Save,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";

export function AdminConfigDashboard() {
  const t = useTranslations();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  // Requête pour récupérer la configuration actuelle
  const { data: currentConfig, isLoading } = api.admin.getSystemConfig.useQuery();

  // Mutations tRPC pour sauvegarder la configuration
  const updateConfigMutation = api.admin.updateSystemConfig.useMutation({
    onSuccess: () => {
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres ont été mis à jour avec succès"
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  });

  const resetConfigMutation = api.admin.resetConfigToDefaults.useMutation({
    onSuccess: () => {
      toast({
        title: "Configuration réinitialisée",
        description: "Les paramètres ont été remis aux valeurs par défaut"
      });
      setHasChanges(false);
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser la configuration",
        variant: "destructive"
      });
    }
  });

  // États pour les différentes configurations
  const [generalConfig, setGeneralConfig] = useState({
    siteName: currentConfig?.general?.siteName || "EcoDeli",
    siteDescription: currentConfig?.general?.siteDescription || "Plateforme de livraison collaborative écologique",
    maintenanceMode: currentConfig?.general?.maintenanceMode || false,
    registrationEnabled: currentConfig?.general?.registrationEnabled || true,
    maxFileUploadSize: currentConfig?.general?.maxFileUploadSize || "10",
    defaultLanguage: currentConfig?.general?.defaultLanguage || "fr",
    timezone: currentConfig?.general?.timezone || "Europe/Paris"
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: currentConfig?.email?.smtpHost || "",
    smtpPort: currentConfig?.email?.smtpPort || "587",
    smtpUser: currentConfig?.email?.smtpUser || "",
    smtpPassword: currentConfig?.email?.smtpPassword || "",
    fromEmail: currentConfig?.email?.fromEmail || "noreply@ecodeli.me",
    fromName: currentConfig?.email?.fromName || "EcoDeli",
    emailVerificationRequired: currentConfig?.email?.emailVerificationRequired || true
  });

  const [paymentConfig, setPaymentConfig] = useState({
    stripePublishableKey: currentConfig?.payment?.stripePublishableKey || "",
    stripeSecretKey: currentConfig?.payment?.stripeSecretKey || "",
    commissionRate: currentConfig?.payment?.commissionRate || "15",
    minimumAmount: currentConfig?.payment?.minimumAmount || "5",
    autoPayoutEnabled: currentConfig?.payment?.autoPayoutEnabled || false,
    payoutDelay: currentConfig?.payment?.payoutDelay || "7"
  });

  const [securityConfig, setSecurityConfig] = useState({
    twoFactorRequired: currentConfig?.security?.twoFactorRequired || false,
    sessionTimeout: currentConfig?.security?.sessionTimeout || "24",
    maxLoginAttempts: currentConfig?.security?.maxLoginAttempts || "5",
    passwordMinLength: currentConfig?.security?.passwordMinLength || "8",
    requireEmailVerification: currentConfig?.security?.requireEmailVerification || true,
    enableCaptcha: currentConfig?.security?.enableCaptcha || true
  });

  const [notificationConfig, setNotificationConfig] = useState({
    pushNotificationsEnabled: currentConfig?.notifications?.pushNotificationsEnabled || true,
    emailNotificationsEnabled: currentConfig?.notifications?.emailNotificationsEnabled || true,
    smsNotificationsEnabled: currentConfig?.notifications?.smsNotificationsEnabled || false,
    adminAlerts: currentConfig?.notifications?.adminAlerts || true,
    userWelcomeEmail: currentConfig?.notifications?.userWelcomeEmail || true,
    orderConfirmationEmail: currentConfig?.notifications?.orderConfirmationEmail || true
  });

  const handleSave = async () => {
    try {
      await updateConfigMutation.mutateAsync({
        general: generalConfig,
        email: emailConfig,
        payment: paymentConfig,
        security: securityConfig,
        notifications: notificationConfig
      });
    } catch (error) {
      // Erreur déjà gérée dans la mutation
    }
  };

  const handleReset = async () => {
    try {
      await resetConfigMutation.mutateAsync();
    } catch (error) {
      // Erreur déjà gérée dans la mutation
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Configuration Système"
          description="Gérez les paramètres généraux de la plateforme EcoDeli"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={resetConfigMutation.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateConfigMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Vous avez des modifications non sauvegardées
          </p>
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Généraux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input
                    id="siteName"
                    value={generalConfig.siteName}
                    onChange={(e) => {
                      setGeneralConfig({ ...generalConfig, siteName: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Langue par défaut</Label>
                  <Select value={generalConfig.defaultLanguage} onValueChange={(value) => {
                    setGeneralConfig({ ...generalConfig, defaultLanguage: value });
                    setHasChanges(true);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Description du site</Label>
                <Textarea
                  id="siteDescription"
                  value={generalConfig.siteDescription}
                  onChange={(e) => {
                    setGeneralConfig({ ...generalConfig, siteDescription: e.target.value });
                    setHasChanges(true);
                  }}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mode maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer le mode maintenance pour bloquer l'accès public
                    </p>
                  </div>
                  <Switch
                    checked={generalConfig.maintenanceMode}
                    onCheckedChange={(checked) => {
                      setGeneralConfig({ ...generalConfig, maintenanceMode: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Inscription ouverte</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre aux nouveaux utilisateurs de s'inscrire
                    </p>
                  </div>
                  <Switch
                    checked={generalConfig.registrationEnabled}
                    onCheckedChange={(checked) => {
                      setGeneralConfig({ ...generalConfig, registrationEnabled: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={emailConfig.smtpHost}
                    onChange={(e) => {
                      setEmailConfig({ ...emailConfig, smtpHost: e.target.value });
                      setHasChanges(true);
                    }}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Email expéditeur</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={emailConfig.fromEmail}
                    onChange={(e) => {
                      setEmailConfig({ ...emailConfig, fromEmail: e.target.value });
                      setHasChanges(true);
                    }}
                    placeholder="noreply@ecodeli.me"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Paiements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="stripePublishableKey">Clé publique Stripe</Label>
                  <Input
                    id="stripePublishableKey"
                    value={paymentConfig.stripePublishableKey}
                    onChange={(e) => {
                      setPaymentConfig({ ...paymentConfig, stripePublishableKey: e.target.value });
                      setHasChanges(true);
                    }}
                    placeholder="pk_test_..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authentification à 2 facteurs obligatoire</Label>
                  <p className="text-sm text-muted-foreground">
                    Obliger l'A2F pour tous les utilisateurs
                  </p>
                </div>
                <Switch
                  checked={securityConfig.twoFactorRequired}
                  onCheckedChange={(checked) => {
                    setSecurityConfig({ ...securityConfig, twoFactorRequired: checked });
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications push activées</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre l'envoi de notifications push
                  </p>
                </div>
                <Switch
                  checked={notificationConfig.pushNotificationsEnabled}
                  onCheckedChange={(checked) => {
                    setNotificationConfig({ ...notificationConfig, pushNotificationsEnabled: checked });
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
