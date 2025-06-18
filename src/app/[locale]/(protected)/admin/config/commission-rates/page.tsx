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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Percent, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Users, 
  Truck, 
  Package, 
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";

export default function CommissionRatesPage() {
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [newRate, setNewRate] = useState({
    serviceType: "",
    userRole: "DELIVERER" as UserRole,
    rate: 0.05,
    calculationType: "PERCENTAGE" as "PERCENTAGE" | "FLAT_FEE",
    flatFee: 0,
    description: "",
    isActive: true
  });

  // Récupérer les taux de commission
  const { data: commissionRates, refetch } = api.adminCommission.getAllRates.useQuery({});
  const { data: stats } = api.adminCommission.getCommissionStats.useQuery({});

  // Mutations
  const createRateMutation = api.adminCommission.createRate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Taux de commission créé");
      setNewRate({
        serviceType: "",
        userRole: "DELIVERER" as UserRole,
        rate: 0.05,
        calculationType: "PERCENTAGE",
        flatFee: 0,
        description: "",
        isActive: true
      });
    },
    onError: (error) => {
      toast.error("Erreur", { description: error.message });
    }
  });

  const updateRateMutation = api.adminCommission.updateRate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Taux mis à jour");
      setEditingRate(null);
    }
  });

  const deleteRateMutation = api.adminCommission.deleteRate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Taux supprimé");
    }
  });

  const serviceTypes = [
    { id: "DELIVERY", label: "Livraisons", icon: Truck, color: "text-blue-600" },
    { id: "PERSONAL_SERVICE", label: "Services personnels", icon: Users, color: "text-green-600" },
    { id: "STORAGE", label: "Stockage", icon: Package, color: "text-purple-600" },
    { id: "OTHER", label: "Autres", icon: Settings, color: "text-orange-600" }
  ];

  const userRoles = [
    { id: "DELIVERER", label: "Livreurs" },
    { id: "PROVIDER", label: "Prestataires" },
    { id: "MERCHANT", label: "Marchands" }
  ];

  const createCommissionRate = () => {
    if (!newRate.serviceType || !newRate.userRole) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    createRateMutation.mutate(newRate);
  };

  const toggleRateStatus = (rateId: string, isActive: boolean) => {
    updateRateMutation.mutate({
      id: rateId,
      isActive
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Taux de commission</h1>
          <p className="text-muted-foreground">
            Configurez les taux de commission par service et type d'utilisateur
          </p>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commission moyenne</p>
                <p className="text-2xl font-bold">
                  {stats?.averageRate ? `${(stats.averageRate * 100).toFixed(1)}%` : '5.0%'}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Percent className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux actifs</p>
                <p className="text-2xl font-bold">{commissionRates?.filter(r => r.isActive).length || 0}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus ce mois</p>
                <p className="text-2xl font-bold">
                  {stats?.monthlyRevenue ? `${stats.monthlyRevenue.toLocaleString('fr-FR')}€` : '0€'}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats?.monthlyTransactions || 0}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rates">Taux de commission</TabsTrigger>
          <TabsTrigger value="create">Créer un taux</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Taux de commission configurés</CardTitle>
              <CardDescription>
                Gestion des taux par service et type d'utilisateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceTypes.map((serviceType) => (
                  <div key={serviceType.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <serviceType.icon className={`h-5 w-5 ${serviceType.color}`} />
                      <h3 className="font-medium">{serviceType.label}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userRoles.map((role) => {
                        const rate = commissionRates?.find(
                          r => r.serviceType === serviceType.id && r.userRole === role.id
                        );
                        
                        return (
                          <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{role.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {rate ? `${(rate.rate * 100).toFixed(1)}%` : 'Non configuré'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {rate && (
                                <>
                                  <Switch
                                    checked={rate.isActive}
                                    onCheckedChange={(checked) => toggleRateStatus(rate.id, checked)}
                                    disabled={updateRateMutation.isPending}
                                  />
                                  <Badge variant={rate.isActive ? "default" : "secondary"}>
                                    {rate.isActive ? "Actif" : "Inactif"}
                                  </Badge>
                                </>
                              )}
                              {!rate && (
                                <Badge variant="outline">À configurer</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Créer un nouveau taux de commission</CardTitle>
              <CardDescription>
                Configurez un taux de commission pour un service et type d'utilisateur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-type">Type de service</Label>
                    <Select
                      value={newRate.serviceType}
                      onValueChange={(value) => setNewRate(prev => ({ ...prev, serviceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un service" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-role">Type d'utilisateur</Label>
                    <Select
                      value={newRate.userRole}
                      onValueChange={(value) => setNewRate(prev => ({ ...prev, userRole: value as UserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calculation-type">Type de calcul</Label>
                    <Select
                      value={newRate.calculationType}
                      onValueChange={(value) => setNewRate(prev => ({ 
                        ...prev, 
                        calculationType: value as "PERCENTAGE" | "FLAT_FEE" 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                        <SelectItem value="FLAT_FEE">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {newRate.calculationType === "PERCENTAGE" ? (
                    <div className="space-y-2">
                      <Label htmlFor="rate">Taux de commission (%)</Label>
                      <div className="relative">
                        <Input
                          id="rate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={newRate.rate * 100}
                          onChange={(e) => setNewRate(prev => ({
                            ...prev,
                            rate: parseFloat(e.target.value) / 100 || 0
                          }))}
                        />
                        <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="flat-fee">Montant fixe (€)</Label>
                      <Input
                        id="flat-fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newRate.flatFee}
                        onChange={(e) => setNewRate(prev => ({
                          ...prev,
                          flatFee: parseFloat(e.target.value) || 0
                        }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Input
                      id="description"
                      value={newRate.description}
                      onChange={(e) => setNewRate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description du taux de commission"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={newRate.isActive}
                      onCheckedChange={(checked) => setNewRate(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="is-active">Activer immédiatement</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={createCommissionRate}
                  disabled={createRateMutation.isPending || !newRate.serviceType || !newRate.userRole}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createRateMutation.isPending ? "Création..." : "Créer le taux"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance par service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceTypes.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <service.icon className={`h-4 w-4 ${service.color}`} />
                        <span className="font-medium">{service.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">1,247€</p>
                        <p className="text-sm text-muted-foreground">ce mois</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Évolution des commissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Graphique des commissions</p>
                    <p className="text-sm text-muted-foreground">Données en temps réel</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
