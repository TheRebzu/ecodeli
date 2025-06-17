"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator, 
  Percent, 
  Euro, 
  Truck, 
  Package, 
  Users, 
  Settings, 
  Save,
  RotateCcw,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function PricingRulesPage() {
  const [saving, setSaving] = useState(false);

  // Récupérer les paramètres actuels
  const { data: settings, refetch } = api.adminSettings.getAll.useQuery();
  const updatePaymentsMutation = api.adminSettings.updatePayments.useMutation({
    onSuccess: () => {
      refetch();
      setSaving(false);
      toast.success("Règles tarifaires mises à jour", {
        description: "Les nouvelles règles sont maintenant appliquées"
      });
    },
    onError: (error) => {
      setSaving(false);
      toast.error("Erreur", {
        description: error.message || "Impossible de sauvegarder les règles tarifaires"
      });
    }
  });

  const updateDeliveryMutation = api.adminSettings.updateDelivery.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Paramètres de livraison mis à jour");
    }
  });

  const [localSettings, setLocalSettings] = useState({
    commissionRate: settings?.payments?.commissionRate || 5.0,
    minimumPayout: settings?.payments?.minimumPayout || 20.0,
    payoutSchedule: settings?.payments?.payoutSchedule || "weekly",
    defaultDeliveryRadius: settings?.delivery?.defaultDeliveryRadius || 10,
    maxDeliveryRadius: settings?.delivery?.maxDeliveryRadius || 50,
    emergencyDeliveryEnabled: settings?.delivery?.emergencyDeliveryEnabled || true,
    deliveryFeeCalculation: settings?.delivery?.deliveryFeeCalculation || "distance"
  });

  const saveSettings = async () => {
    setSaving(true);
    
    try {
      await updatePaymentsMutation.mutateAsync({
        commissionRate: localSettings.commissionRate,
        minimumPayout: localSettings.minimumPayout,
        payoutSchedule: localSettings.payoutSchedule
      });

      await updateDeliveryMutation.mutateAsync({
        defaultDeliveryRadius: localSettings.defaultDeliveryRadius,
        maxDeliveryRadius: localSettings.maxDeliveryRadius,
        emergencyDeliveryEnabled: localSettings.emergencyDeliveryEnabled,
        deliveryFeeCalculation: localSettings.deliveryFeeCalculation
      });
    } catch (error) {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setLocalSettings({
      commissionRate: 5.0,
      minimumPayout: 20.0,
      payoutSchedule: "weekly",
      defaultDeliveryRadius: 10,
      maxDeliveryRadius: 50,
      emergencyDeliveryEnabled: true,
      deliveryFeeCalculation: "distance"
    });
    toast.info("Paramètres réinitialisés", {
      description: "Les valeurs par défaut ont été restaurées"
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Règles tarifaires</h1>
          <p className="text-muted-foreground">
            Configurez les commissions, frais de livraison et règles de paiement
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="commissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="delivery">Livraison</TabsTrigger>
          <TabsTrigger value="payouts">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-6">
          {/* Commissions générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Taux de commission
              </CardTitle>
              <CardDescription>
                Pourcentage prélevé sur chaque transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission-rate">Taux de commission général (%)</Label>
                  <div className="relative">
                    <Input
                      id="commission-rate"
                      type="number"
                      min="0"
                      max="30"
                      step="0.1"
                      value={localSettings.commissionRate}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        commissionRate: parseFloat(e.target.value) || 0
                      }))}
                    />
                    <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Appliqué à toutes les transactions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Commission estimée</Label>
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {(100 * localSettings.commissionRate / 100).toFixed(2)}€ pour 100€
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Impact mensuel estimé</Label>
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">
                      +{((localSettings.commissionRate - 5) * 1000).toFixed(0)}€/mois
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Commissions par type de service</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium">Livraisons</p>
                        <p className="text-sm text-muted-foreground">Transport de colis</p>
                      </div>
                    </div>
                    <Badge variant="outline">{localSettings.commissionRate}%</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Services personnels</p>
                        <p className="text-sm text-muted-foreground">Prestataires de services</p>
                      </div>
                    </div>
                    <Badge variant="outline">{localSettings.commissionRate}%</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="font-medium">Stockage</p>
                        <p className="text-sm text-muted-foreground">Location de boxes</p>
                      </div>
                    </div>
                    <Badge variant="outline">{(localSettings.commissionRate * 0.8).toFixed(1)}%</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="font-medium">Autres services</p>
                        <p className="text-sm text-muted-foreground">Services spécialisés</p>
                      </div>
                    </div>
                    <Badge variant="outline">{(localSettings.commissionRate * 1.2).toFixed(1)}%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          {/* Paramètres de livraison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Paramètres de livraison
              </CardTitle>
              <CardDescription>
                Configuration des zones et frais de livraison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Zones de livraison</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="default-radius">Rayon de livraison par défaut (km)</Label>
                    <Input
                      id="default-radius"
                      type="number"
                      min="1"
                      max="100"
                      value={localSettings.defaultDeliveryRadius}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        defaultDeliveryRadius: parseInt(e.target.value) || 1
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-radius">Rayon maximum (km)</Label>
                    <Input
                      id="max-radius"
                      type="number"
                      min="1"
                      max="200"
                      value={localSettings.maxDeliveryRadius}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        maxDeliveryRadius: parseInt(e.target.value) || 1
                      }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="emergency-delivery"
                      checked={localSettings.emergencyDeliveryEnabled}
                      onCheckedChange={(checked) => setLocalSettings(prev => ({
                        ...prev,
                        emergencyDeliveryEnabled: checked
                      }))}
                    />
                    <Label htmlFor="emergency-delivery">Livraisons d'urgence</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Calcul des frais</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fee-calculation">Mode de calcul</Label>
                    <Select
                      value={localSettings.deliveryFeeCalculation}
                      onValueChange={(value) => setLocalSettings(prev => ({
                        ...prev,
                        deliveryFeeCalculation: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">Basé sur la distance</SelectItem>
                        <SelectItem value="zone">Basé sur les zones</SelectItem>
                        <SelectItem value="weight">Basé sur le poids</SelectItem>
                        <SelectItem value="fixed">Tarif fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Formule actuelle</h5>
                    <p className="text-sm text-blue-700">
                      {localSettings.deliveryFeeCalculation === 'distance' && 
                        "Frais = 2€ + (distance × 0.50€/km)"}
                      {localSettings.deliveryFeeCalculation === 'zone' && 
                        "Frais = tarif de zone prédéfini"}
                      {localSettings.deliveryFeeCalculation === 'weight' && 
                        "Frais = 3€ + (poids × 0.20€/kg)"}
                      {localSettings.deliveryFeeCalculation === 'fixed' && 
                        "Frais = 5€ (fixe)"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          {/* Paramètres de paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Gestion des paiements
              </CardTitle>
              <CardDescription>
                Configuration des virements et seuils de paiement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Seuils de paiement</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minimum-payout">Montant minimum de retrait (€)</Label>
                    <div className="relative">
                      <Input
                        id="minimum-payout"
                        type="number"
                        min="5"
                        max="500"
                        step="5"
                        value={localSettings.minimumPayout}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          minimumPayout: parseFloat(e.target.value) || 20
                        }))}
                      />
                      <Euro className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Montant minimum pour effectuer un retrait
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payout-schedule">Fréquence des virements</Label>
                    <Select
                      value={localSettings.payoutSchedule}
                      onValueChange={(value) => setLocalSettings(prev => ({
                        ...prev,
                        payoutSchedule: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Quotidien</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                        <SelectItem value="manual">Manuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Statistiques</h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Virements cette semaine</span>
                      <Badge variant="secondary">1,247€</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Commissions perçues</span>
                      <Badge variant="secondary">182€</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Utilisateurs éligibles</span>
                      <Badge variant="secondary">47</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-yellow-800">Important</p>
                    <p className="text-sm text-yellow-700">
                      Les modifications des règles tarifaires affectent toutes les nouvelles transactions. 
                      Les transactions en cours conservent leurs tarifs d'origine.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
