'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Navigation,
  Zap,
  Star,
  Clock
} from 'lucide-react';

interface RouteZone {
  latitude: number;
  longitude: number;
  radius: number;
  cityName?: string;
  postalCodes?: string[];
  isPreferred?: boolean;
}

interface Route {
  id: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  zones: RouteZone[];
  createdAt: Date;
}

export default function DelivererRoutesManager() {
  const { toast } = useToast();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 1,
    zones: [] as RouteZone[]
  });

  // État pour l'ajout de zone
  const [newZone, setNewZone] = useState({
    latitude: '',
    longitude: '',
    radius: '5',
    cityName: '',
    postalCodes: '',
    isPreferred: false
  });

  // Récupérer les routes du livreur
  const { data: routes, refetch } = api.delivery.routes.getByDeliverer.useQuery();

  // Mutations
  const createRouteMutation = api.delivery.routes.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Route créée',
        description: 'Votre nouveau trajet a été enregistré avec succès',
        variant: 'success'
      });
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 1,
      zones: []
    });
    setNewZone({
      latitude: '',
      longitude: '',
      radius: '5',
      cityName: '',
      postalCodes: '',
      isPreferred: false
    });
  };

  const handleAddZone = () => {
    if (!newZone.latitude || !newZone.longitude) {
      toast({
        title: 'Erreur',
        description: 'Latitude et longitude sont requises',
        variant: 'destructive'
      });
      return;
    }

    const zone: RouteZone = {
      latitude: parseFloat(newZone.latitude),
      longitude: parseFloat(newZone.longitude),
      radius: parseFloat(newZone.radius),
      cityName: newZone.cityName || undefined,
      postalCodes: newZone.postalCodes ? newZone.postalCodes.split(',').map(code => code.trim()) : undefined,
      isPreferred: newZone.isPreferred
    };

    setFormData(prev => ({
      ...prev,
      zones: [...prev.zones, zone]
    }));

    setNewZone({
      latitude: '',
      longitude: '',
      radius: '5',
      cityName: '',
      postalCodes: '',
      isPreferred: false
    });
  };

  const handleRemoveZone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      zones: prev.zones.filter((_, i) => i !== index)
    }));
  };

  const handleCreateRoute = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du trajet est requis',
        variant: 'destructive'
      });
      return;
    }

    if (formData.zones.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Au moins une zone doit être définie',
        variant: 'destructive'
      });
      return;
    }

    createRouteMutation.mutate({
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      zones: formData.zones
    });
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Haute';
      case 2: return 'Moyenne';
      case 3: return 'Basse';
      default: return 'Inconnue';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes trajets préférés</h1>
          <p className="text-muted-foreground">
            Définissez vos zones de livraison préférées pour recevoir des propositions ciblées
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau trajet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau trajet</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="zones">Zones géographiques</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du trajet *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Centre-ville Paris"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description optionnelle du trajet"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={formData.priority.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Haute - Je préfère fortement ces zones</SelectItem>
                      <SelectItem value="2">Moyenne - Je peux faire ces zones</SelectItem>
                      <SelectItem value="3">Basse - Je fais si besoin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="zones" className="space-y-4">
                {/* Zones existantes */}
                {formData.zones.length > 0 && (
                  <div className="space-y-2">
                    <Label>Zones définies</Label>
                    <div className="space-y-2">
                      {formData.zones.map((zone, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">
                              {zone.cityName || `Zone ${index + 1}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} - Rayon: {zone.radius}km
                            </div>
                            {zone.isPreferred && (
                              <Badge variant="secondary" className="mt-1">
                                <Star className="h-3 w-3 mr-1" />
                                Préférée
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveZone(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ajouter nouvelle zone */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base font-medium">Ajouter une zone</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude *</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="48.8566"
                        value={newZone.latitude}
                        onChange={(e) => setNewZone(prev => ({ ...prev, latitude: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude *</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="2.3522"
                        value={newZone.longitude}
                        onChange={(e) => setNewZone(prev => ({ ...prev, longitude: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="radius">Rayon (km)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min="0.5"
                        max="25"
                        value={newZone.radius}
                        onChange={(e) => setNewZone(prev => ({ ...prev, radius: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cityName">Nom de la zone</Label>
                      <Input
                        id="cityName"
                        placeholder="Paris 1er"
                        value={newZone.cityName}
                        onChange={(e) => setNewZone(prev => ({ ...prev, cityName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCodes">Codes postaux (séparés par des virgules)</Label>
                    <Input
                      id="postalCodes"
                      placeholder="75001, 75002, 75003"
                      value={newZone.postalCodes}
                      onChange={(e) => setNewZone(prev => ({ ...prev, postalCodes: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPreferred"
                      checked={newZone.isPreferred}
                      onChange={(e) => setNewZone(prev => ({ ...prev, isPreferred: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="isPreferred">Zone préférée</Label>
                  </div>

                  <Button onClick={handleAddZone} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter cette zone
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateRoute}
                disabled={createRouteMutation.isPending}
              >
                {createRouteMutation.isPending ? 'Création...' : 'Créer le trajet'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Routes List */}
      <div className="space-y-4">
        {!routes || routes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun trajet défini</h3>
              <p className="text-muted-foreground mb-4">
                Créez vos premiers trajets préférés pour recevoir des propositions de livraison ciblées
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer mon premier trajet
              </Button>
            </CardContent>
          </Card>
        ) : (
          routes.map((route: any) => (
            <Card key={route.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Navigation className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{route.name}</CardTitle>
                      {route.description && (
                        <p className="text-sm text-muted-foreground">{route.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(route.priority)}>
                      {getPriorityLabel(route.priority)}
                    </Badge>
                    <Badge variant={route.isActive ? 'success' : 'secondary'}>
                      {route.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Zones */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Zones couvertes ({route.zones?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {route.zones?.map((zone: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {zone.cityName || `Zone ${index + 1}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Rayon: {zone.radiusKm}km
                            </div>
                          </div>
                          {zone.isPreferred && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Créé le {new Date(route.createdAt).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Paramètres
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}