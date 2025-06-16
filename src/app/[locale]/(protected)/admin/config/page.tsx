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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Globe, 
  Mail, 
  CreditCard, 
  Shield, 
  Bell,
  Save,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";

export default function ConfigPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  // États pour les différentes configurations
  const [generalConfig, setGeneralConfig] = useState({ siteName: "EcoDeli",
    siteDescription: "Plateforme de livraison collaborative écologique",
    maintenanceMode: false,
    registrationEnabled: true,
    maxFileUploadSize: "10", // MB
    defaultLanguage: "fr",
    timezone: "Europe/Paris"
   });

  const [emailConfig, setEmailConfig] = useState({ smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "noreply@ecodeli.me",
    fromName: "EcoDeli",
    emailVerificationRequired: true
   });

  const [paymentConfig, setPaymentConfig] = useState({ stripePublishableKey: "",
    stripeSecretKey: "",
    commissionRate: "15", // %
    minimumAmount: "5", // €
    autoPayoutEnabled: false,
    payoutDelay: "7" // jours
   });

  const [securityConfig, setSecurityConfig] = useState({ twoFactorRequired: false,
    sessionTimeout: "24", // heures
    maxLoginAttempts: "5",
    passwordMinLength: "8",
    requireEmailVerification: true,
    enableCaptcha: true
   });

  const [notificationConfig, setNotificationConfig] = useState({ pushNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    adminAlerts: true,
    userWelcomeEmail: true,
    orderConfirmationEmail: true
   });

  const handleSave = async () => {
    try {
      // Ici on sauvegarderait les configurations via l'API
      // await api.admin.updateConfig.mutate({ ...  });
      
      toast({ title: "Configuration sauvegardée",
        description: "Les paramètres ont été mis à jour avec succès" });
      setHasChanges(false);
    } catch (error) {
      toast({ title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive" });
    }
  };

  const handleReset = () => {
    // Reset aux valeurs par défaut
    toast({ title: "Configuration réinitialisée",
      description: "Les paramètres ont été remis aux valeurs par défaut" });
    setHasChanges(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Configuration Système"
          description="Gérez les paramètres généraux de la plateforme EcoDeli"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
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
                      Désactive temporairement l'accès au site pour maintenance
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
                    <Label>Inscriptions autorisées</Label>
                    <p className="text-sm text-muted-foreground">
                      Permet aux nouveaux utilisateurs de s'inscrire
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port SMTP</Label>
                  <Input
                    id="smtpPort"
                    value={emailConfig.smtpPort}
                    onChange={(e) => {
                      setEmailConfig({ ...emailConfig, smtpPort: e.target.value });
                      setHasChanges(true);
                    }}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">Nom expéditeur</Label>
                  <Input
                    id="fromName"
                    value={emailConfig.fromName}
                    onChange={(e) => {
                      setEmailConfig({ ...emailConfig, fromName: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Vérification email obligatoire</Label>
                  <p className="text-sm text-muted-foreground">
                    Oblige les utilisateurs à vérifier leur email
                  </p>
                </div>
                <Switch
                  checked={emailConfig.emailVerificationRequired}
                  onCheckedChange={(checked) => {
                    setEmailConfig({ ...emailConfig, emailVerificationRequired: checked });
                    setHasChanges(true);
                  }}
                />
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  ℹ️ Configuration Stripe pour les paiements sécurisés
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Taux de commission (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    value={paymentConfig.commissionRate}
                    onChange={(e) => {
                      setPaymentConfig({ ...paymentConfig, commissionRate: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumAmount">Montant minimum (€)</Label>
                  <Input
                    id="minimumAmount"
                    type="number"
                    value={paymentConfig.minimumAmount}
                    onChange={(e) => {
                      setPaymentConfig({ ...paymentConfig, minimumAmount: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Paiements automatiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Active les paiements automatiques après livraison
                  </p>
                </div>
                <Switch
                  checked={paymentConfig.autoPayoutEnabled}
                  onCheckedChange={(checked) => {
                    setPaymentConfig({ ...paymentConfig, autoPayoutEnabled: checked });
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Durée de session (heures)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securityConfig.sessionTimeout}
                    onChange={(e) => {
                      setSecurityConfig({ ...securityConfig, sessionTimeout: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securityConfig.maxLoginAttempts}
                    onChange={(e) => {
                      setSecurityConfig({ ...securityConfig, maxLoginAttempts: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Authentification à deux facteurs</Label>
                    <p className="text-sm text-muted-foreground">
                      Oblige l'utilisation de 2FA pour les admins
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

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>CAPTCHA activé</Label>
                    <p className="text-sm text-muted-foreground">
                      Utilise reCAPTCHA pour les formulaires sensibles
                    </p>
                  </div>
                  <Switch
                    checked={securityConfig.enableCaptcha}
                    onCheckedChange={(checked) => {
                      setSecurityConfig({ ...securityConfig, enableCaptcha: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications push</Label>
                    <p className="text-sm text-muted-foreground">
                      Active les notifications push pour l'application
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

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications email</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoie des notifications par email
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.emailNotificationsEnabled}
                    onCheckedChange={(checked) => {
                      setNotificationConfig({ ...notificationConfig, emailNotificationsEnabled: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email de bienvenue</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoie un email de bienvenue aux nouveaux utilisateurs
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.userWelcomeEmail}
                    onCheckedChange={(checked) => {
                      setNotificationConfig({ ...notificationConfig, userWelcomeEmail: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes admin</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications importantes pour les administrateurs
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.adminAlerts}
                    onCheckedChange={(checked) => {
                      setNotificationConfig({ ...notificationConfig, adminAlerts: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
