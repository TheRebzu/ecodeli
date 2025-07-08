"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Clock, 
  Users, 
  Settings,
  Save,
  Plus,
  Trash2,
  Info,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceRate {
  id: string;
  serviceName: string;
  basePrice: number;
  hourlyRate: number;
  currency: string;
  minimumDuration: number;
  maximumDuration: number;
  isActive: boolean;
  specialRates: SpecialRate[];
}

interface SpecialRate {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  conditions: string;
  isActive: boolean;
}

export default function ProviderRatesPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.services");
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state for new rate
  const [newRate, setNewRate] = useState<Partial<ServiceRate>>({
    serviceName: "",
    basePrice: 0,
    hourlyRate: 0,
    currency: "EUR",
    minimumDuration: 30,
    maximumDuration: 480,
    isActive: true,
    specialRates: []
  });

  useEffect(() => {
    const fetchRates = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/provider/services/rates?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setRates(data.rates || []);
        }
      } catch (error) {
        console.error("Error fetching rates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [user]);

  const handleSaveRate = async (rate: ServiceRate) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/provider/services/rates/${rate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rate)
      });
      
      if (response.ok) {
        // Update local state
        setRates(prev => prev.map(r => r.id === rate.id ? rate : r));
      }
    } catch (error) {
      console.error("Error saving rate:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewRate = async () => {
    if (!newRate.serviceName || !newRate.basePrice) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/provider/services/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRate, userId: user?.id })
      });
      
      if (response.ok) {
        const savedRate = await response.json();
        setRates(prev => [...prev, savedRate]);
        setNewRate({
          serviceName: "",
          basePrice: 0,
          hourlyRate: 0,
          currency: "EUR",
          minimumDuration: 30,
          maximumDuration: 480,
          isActive: true,
          specialRates: []
        });
      }
    } catch (error) {
      console.error("Error adding rate:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration des Tarifs"
        description="Gérez la tarification de vos services et options spéciales"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configurez vos tarifs de base et ajoutez des tarifs spéciaux pour les weekends, jours fériés ou interventions urgentes.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rates">Tarifs de Base</TabsTrigger>
          <TabsTrigger value="special">Tarifs Spéciaux</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-6">
          {/* Existing Rates */}
          <div className="space-y-4">
            {rates.map((rate) => (
              <Card key={rate.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        {rate.serviceName}
                      </CardTitle>
                      <CardDescription>
                        Configuration des tarifs pour ce service
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rate.isActive ? "default" : "secondary"}>
                        {rate.isActive ? "Actif" : "Inactif"}
                      </Badge>
                      <Switch 
                        checked={rate.isActive}
                        onCheckedChange={(checked) => 
                          handleSaveRate({ ...rate, isActive: checked })
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Prix de base</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rate.basePrice}
                          onChange={(e) => 
                            setRates(prev => prev.map(r => 
                              r.id === rate.id 
                                ? { ...r, basePrice: parseFloat(e.target.value) || 0 }
                                : r
                            ))
                          }
                          step="0.01"
                        />
                        <span className="text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tarif horaire</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rate.hourlyRate}
                          onChange={(e) => 
                            setRates(prev => prev.map(r => 
                              r.id === rate.id 
                                ? { ...r, hourlyRate: parseFloat(e.target.value) || 0 }
                                : r
                            ))
                          }
                          step="0.01"
                        />
                        <span className="text-sm text-muted-foreground">€/h</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Durée minimum</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rate.minimumDuration}
                          onChange={(e) => 
                            setRates(prev => prev.map(r => 
                              r.id === rate.id 
                                ? { ...r, minimumDuration: parseInt(e.target.value) || 0 }
                                : r
                            ))
                          }
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => handleSaveRate(rate)}
                      disabled={saving}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setRates(prev => prev.filter(r => r.id !== rate.id))}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Ajouter un nouveau tarif
              </CardTitle>
              <CardDescription>
                Créez un tarif pour un nouveau service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du service</Label>
                  <Input
                    value={newRate.serviceName || ""}
                    onChange={(e) => setNewRate(prev => ({ ...prev, serviceName: e.target.value }))}
                    placeholder="Ex: Ménage, Jardinage..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prix de base</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newRate.basePrice || 0}
                      onChange={(e) => setNewRate(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                      step="0.01"
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleAddNewRate}
                disabled={saving || !newRate.serviceName || !newRate.basePrice}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le tarif
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tarifs Spéciaux</CardTitle>
              <CardDescription>
                Configurez des majorations pour certaines conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Fonctionnalité en développement</p>
                <p className="text-sm">Weekend, jours fériés, urgences...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de Tarification</CardTitle>
              <CardDescription>
                Configuration générale de vos tarifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Paramètres globaux en développement</p>
                <p className="text-sm">Devises, taxes, conditions...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 