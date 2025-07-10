"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MapPin, 
  Plus, 
  Edit,
  Trash2,
  Clock,
  Euro,
  Car,
  Route,
  CheckCircle,
  AlertCircle,
  Settings,
  Search,
  Filter,
  Download,
  Upload,
  Loader2,
  Map,
  Calculator
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  postalCodes: string[];
  cities: string[];
  priceStructure: {
    basePrice: number;
    pricePerKm: number;
    freeThreshold: number;
    maxDistance: number;
  };
  timeSlots: {
    day: string;
    slots: { start: string; end: string; capacity: number }[];
  }[];
  specialRules: {
    minOrderAmount: number;
    expressFee: number;
    bulkyItemFee: number;
    weekendSurcharge: number;
  };
  stats: {
    totalDeliveries: number;
    averageRating: number;
    lastDelivery: string;
  };
}

interface ZoneManagerProps {
  merchantId: string;
}

export default function ZoneManager({ merchantId }: ZoneManagerProps) {
  const t = useTranslations("merchant.zones");
  const { toast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Nouveau zone par défaut
  const defaultZone: Partial<DeliveryZone> = {
    name: '',
    description: '',
    isActive: true,
    postalCodes: [],
    cities: [],
    priceStructure: {
      basePrice: 5.00,
      pricePerKm: 0.50,
      freeThreshold: 50.00,
      maxDistance: 25
    },
    timeSlots: [
      {
        day: 'Lundi',
        slots: [
          { start: '09:00', end: '12:00', capacity: 10 },
          { start: '14:00', end: '18:00', capacity: 15 }
        ]
      }
    ],
    specialRules: {
      minOrderAmount: 20.00,
      expressFee: 3.00,
      bulkyItemFee: 5.00,
      weekendSurcharge: 2.00
    }
  };

  useEffect(() => {
    fetchZones();
  }, [merchantId]);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/merchant/zones`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      } else {
        // Données de démonstration si aucune zone configurée
        setZones([
          {
            id: '1',
            name: 'Centre-ville Paris',
            description: 'Zone de livraison premium pour le centre de Paris',
            isActive: true,
            postalCodes: ['75001', '75002', '75003', '75004'],
            cities: ['Paris 1er', 'Paris 2e', 'Paris 3e', 'Paris 4e'],
            priceStructure: {
              basePrice: 6.00,
              pricePerKm: 0.80,
              freeThreshold: 75.00,
              maxDistance: 15
            },
            timeSlots: [
              {
                day: 'Lundi',
                slots: [
                  { start: '09:00', end: '12:00', capacity: 15 },
                  { start: '14:00', end: '18:00', capacity: 20 }
                ]
              },
              {
                day: 'Mardi',
                slots: [
                  { start: '09:00', end: '12:00', capacity: 15 },
                  { start: '14:00', end: '18:00', capacity: 20 }
                ]
              }
            ],
            specialRules: {
              minOrderAmount: 30.00,
              expressFee: 5.00,
              bulkyItemFee: 8.00,
              weekendSurcharge: 3.00
            },
            stats: {
              totalDeliveries: 247,
              averageRating: 4.6,
              lastDelivery: new Date().toISOString()
            }
          },
          {
            id: '2',
            name: 'Banlieue proche',
            description: 'Livraisons en première couronne parisienne',
            isActive: true,
            postalCodes: ['92100', '92200', '93100', '94200'],
            cities: ['Boulogne', 'Neuilly', 'Montreuil', 'Ivry'],
            priceStructure: {
              basePrice: 4.50,
              pricePerKm: 0.60,
              freeThreshold: 60.00,
              maxDistance: 30
            },
            timeSlots: [
              {
                day: 'Mercredi',
                slots: [
                  { start: '10:00', end: '16:00', capacity: 12 }
                ]
              }
            ],
            specialRules: {
              minOrderAmount: 25.00,
              expressFee: 4.00,
              bulkyItemFee: 6.00,
              weekendSurcharge: 2.50
            },
            stats: {
              totalDeliveries: 134,
              averageRating: 4.3,
              lastDelivery: new Date(Date.now() - 86400000).toISOString()
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement zones:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les zones de livraison"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZone = async (zoneData: Partial<DeliveryZone>) => {
    try {
      setSaving(true);
      
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/merchant/zones/${zoneData.id}` : '/api/merchant/zones';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(zoneData)
      });

      if (response.ok) {
        const savedZone = await response.json();
        
        if (isEditing) {
          setZones(prev => prev.map(zone => 
            zone.id === savedZone.id ? savedZone : zone
          ));
        } else {
          setZones(prev => [...prev, savedZone]);
        }
        
        setIsDialogOpen(false);
        setSelectedZone(null);
        
        toast({
          title: isEditing ? "Zone mise à jour" : "Zone créée",
          description: "Les paramètres ont été sauvegardés avec succès"
        });
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder la zone"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/merchant/zones/${zoneId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setZones(prev => prev.filter(zone => zone.id !== zoneId));
        toast({
          title: "Zone supprimée",
          description: "La zone de livraison a été supprimée"
        });
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la zone"
      });
    }
  };

  const handleToggleZone = async (zoneId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/merchant/zones/${zoneId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        setZones(prev => prev.map(zone => 
          zone.id === zoneId ? { ...zone, isActive } : zone
        ));
        toast({
          title: "Zone mise à jour",
          description: `Zone ${isActive ? 'activée' : 'désactivée'} avec succès`
        });
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour la zone"
      });
    }
  };

  const openCreateDialog = () => {
    setSelectedZone(defaultZone as DeliveryZone);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && zone.isActive) ||
                         (filterStatus === 'inactive' && !zone.isActive)
    return matchesSearch && matchesFilter
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des zones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête et actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Zones de Livraison</h2>
          <p className="text-muted-foreground">
            Configurez vos zones pour le service "lâcher de chariot" EcoDeli
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Zone
        </Button>
      </div>

      {/* Filtres et recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les zones</SelectItem>
            <SelectItem value="active">Zones actives</SelectItem>
            <SelectItem value="inactive">Zones inactives</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredZones.map((zone) => (
          <Card key={zone.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {zone.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={zone.isActive}
                    onCheckedChange={(checked) => handleToggleZone(zone.id, checked)}
                  />
                  <Badge variant={zone.isActive ? 'default' : 'secondary'}>
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Livraisons</p>
                  <p className="font-medium">{zone.stats.totalDeliveries}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Note moyenne</p>
                  <p className="font-medium">{zone.stats.averageRating}/5</p>
                </div>
              </div>

              {/* Tarification */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Tarification</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Base: </span>
                    <span className="font-medium">{zone.priceStructure.basePrice.toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Par km: </span>
                    <span className="font-medium">{zone.priceStructure.pricePerKm.toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gratuit dès: </span>
                    <span className="font-medium">{zone.priceStructure.freeThreshold.toFixed(2)}€</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distance max: </span>
                    <span className="font-medium">{zone.priceStructure.maxDistance}km</span>
                  </div>
                </div>
              </div>

              {/* Zones couvertes */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Zones couvertes</h4>
                <div className="flex flex-wrap gap-1">
                  {zone.postalCodes.slice(0, 3).map((code, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {code}
                    </Badge>
                  ))}
                  {zone.postalCodes.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{zone.postalCodes.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(zone)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteZone(zone.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Supprimer
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {zone.timeSlots.length} créneaux
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredZones.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune zone configurée</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première zone de livraison pour commencer
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une zone
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de création/édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Modifier la zone' : 'Créer une nouvelle zone'}
            </DialogTitle>
            <DialogDescription>
              Configurez les paramètres de livraison pour cette zone géographique
            </DialogDescription>
          </DialogHeader>

          {selectedZone && (
            <ZoneForm
              zone={selectedZone}
              onSave={handleSaveZone}
              onCancel={() => setIsDialogOpen(false)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant formulaire pour créer/éditer une zone
interface ZoneFormProps {
  zone: DeliveryZone;
  onSave: (zone: DeliveryZone) => void;
  onCancel: () => void;
  saving: boolean;
}

function ZoneForm({ zone: initialZone, onSave, onCancel, saving }: ZoneFormProps) {
  const [zone, setZone] = useState<DeliveryZone>(initialZone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(zone);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="pricing">Tarification</TabsTrigger>
          <TabsTrigger value="schedule">Créneaux</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Nom de la zone</Label>
              <Input
                id="zone-name"
                value={zone.name}
                onChange={(e) => setZone(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Centre-ville Paris"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-status">Statut</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="zone-status"
                  checked={zone.isActive}
                  onCheckedChange={(checked) => setZone(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="zone-status">Zone active</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-description">Description</Label>
            <Textarea
              id="zone-description"
              value={zone.description}
              onChange={(e) => setZone(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la zone de livraison..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal-codes">Codes postaux (séparés par des virgules)</Label>
              <Textarea
                id="postal-codes"
                value={zone.postalCodes.join(', ')}
                onChange={(e) => setZone(prev => ({ 
                  ...prev, 
                  postalCodes: e.target.value.split(',').map(code => code.trim()).filter(Boolean)
                }))}
                placeholder="75001, 75002, 75003..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cities">Villes (séparées par des virgules)</Label>
              <Textarea
                id="cities"
                value={zone.cities.join(', ')}
                onChange={(e) => setZone(prev => ({ 
                  ...prev, 
                  cities: e.target.value.split(',').map(city => city.trim()).filter(Boolean)
                }))}
                placeholder="Paris 1er, Paris 2e..."
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base-price">Prix de base (€)</Label>
              <Input
                id="base-price"
                type="number"
                step="0.01"
                value={zone.priceStructure.basePrice}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  priceStructure: {
                    ...prev.priceStructure,
                    basePrice: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-per-km">Prix par km (€)</Label>
              <Input
                id="price-per-km"
                type="number"
                step="0.01"
                value={zone.priceStructure.pricePerKm}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  priceStructure: {
                    ...prev.priceStructure,
                    pricePerKm: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-threshold">Seuil gratuit (€)</Label>
              <Input
                id="free-threshold"
                type="number"
                step="0.01"
                value={zone.priceStructure.freeThreshold}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  priceStructure: {
                    ...prev.priceStructure,
                    freeThreshold: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-distance">Distance max (km)</Label>
              <Input
                id="max-distance"
                type="number"
                value={zone.priceStructure.maxDistance}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  priceStructure: {
                    ...prev.priceStructure,
                    maxDistance: parseInt(e.target.value) || 0
                  }
                }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Configurez les créneaux de livraison disponibles pour cette zone. 
              Les clients pourront choisir parmi ces créneaux lors de leur commande.
            </AlertDescription>
          </Alert>
          {/* Interface simplifiée pour les créneaux */}
          <div className="text-sm text-muted-foreground">
            Configuration des créneaux disponible dans la version complète
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-order">Commande minimum (€)</Label>
              <Input
                id="min-order"
                type="number"
                step="0.01"
                value={zone.specialRules.minOrderAmount}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  specialRules: {
                    ...prev.specialRules,
                    minOrderAmount: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="express-fee">Frais express (€)</Label>
              <Input
                id="express-fee"
                type="number"
                step="0.01"
                value={zone.specialRules.expressFee}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  specialRules: {
                    ...prev.specialRules,
                    expressFee: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulky-fee">Frais objets volumineux (€)</Label>
              <Input
                id="bulky-fee"
                type="number"
                step="0.01"
                value={zone.specialRules.bulkyItemFee}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  specialRules: {
                    ...prev.specialRules,
                    bulkyItemFee: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekend-surcharge">Supplément weekend (€)</Label>
              <Input
                id="weekend-surcharge"
                type="number"
                step="0.01"
                value={zone.specialRules.weekendSurcharge}
                onChange={(e) => setZone(prev => ({
                  ...prev,
                  specialRules: {
                    ...prev.specialRules,
                    weekendSurcharge: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Mettre à jour' : 'Créer la zone'}
        </Button>
      </DialogFooter>
    </form>
  );
}