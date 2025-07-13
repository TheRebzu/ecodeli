"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Shield,
  CreditCard,
  Users,
  Package,
  Bell,
  Database,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { GeneralSettings } from "./general-settings";
import { SecuritySettings } from "./security-settings";
import { PaymentSettings } from "./payment-settings";
import { NotificationSettings } from "./notification-settings";
import { SystemSettings } from "./system-settings";

export function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulation de sauvegarde
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setHasChanges(false);
    // Logique de réinitialisation
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Settings className="h-8 w-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold">Configuration Système</h2>
            <p className="text-muted-foreground">
              Gestion des paramètres globaux de la plateforme
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Badge
              variant="outline"
              className="text-orange-600 border-orange-200"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Modifications non sauvegardées
            </Badge>
          )}

          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>

          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
      </div>

      {/* Status du système */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Système</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Opérationnel</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Base de données</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Connectée</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Paiements</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Stripe actif</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">OneSignal OK</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets de configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de Configuration</CardTitle>
          <CardDescription>
            Modifiez les paramètres selon vos besoins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger
                value="general"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Général</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Sécurité</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="flex items-center space-x-2"
              >
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Paiements</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="flex items-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Système</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
              <GeneralSettings onSettingsChange={() => setHasChanges(true)} />
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <SecuritySettings onSettingsChange={() => setHasChanges(true)} />
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <PaymentSettings onSettingsChange={() => setHasChanges(true)} />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationSettings
                onSettingsChange={() => setHasChanges(true)}
              />
            </TabsContent>

            <TabsContent value="system" className="mt-6">
              <SystemSettings onSettingsChange={() => setHasChanges(true)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
