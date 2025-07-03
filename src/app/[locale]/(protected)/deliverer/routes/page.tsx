"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Plus, 
  Calendar,
  Clock,
  Truck,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Route
} from "lucide-react";
import { toast } from "sonner";

interface Route {
  id: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  vehicleType: string;
  maxDistance: number;
  minPrice: number;
  isActive: boolean;
  createdAt: string;
}

export default function DelivererRoutesPage() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRoute, setNewRoute] = useState({
    startLocation: "",
    endLocation: "",
    startTime: "08:00",
    endTime: "18:00",
    daysOfWeek: [] as string[],
    vehicleType: "CAR",
    maxDistance: 10,
    minPrice: 15
  });

  const daysOfWeek = [
    { value: "monday", label: "Lundi" },
    { value: "tuesday", label: "Mardi" },
    { value: "wednesday", label: "Mercredi" },
    { value: "thursday", label: "Jeudi" },
    { value: "friday", label: "Vendredi" },
    { value: "saturday", label: "Samedi" },
    { value: "sunday", label: "Dimanche" }
  ];

  const vehicleTypes = [
    { value: "CAR", label: "Voiture" },
    { value: "BIKE", label: "Vélo" },
    { value: "SCOOTER", label: "Scooter" },
    { value: "TRUCK", label: "Camion" },
    { value: "WALKING", label: "À pied" }
  ];

  useEffect(() => {
    if (user) {
      fetchRoutes();
    }
  }, [user]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/deliverer/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error("Erreur lors du chargement des trajets");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async () => {
    if (!newRoute.startLocation || !newRoute.endLocation || newRoute.daysOfWeek.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const response = await fetch('/api/deliverer/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoute)
      });

      if (response.ok) {
        toast.success("Trajet ajouté avec succès");
        setShowAddDialog(false);
        setNewRoute({
          startLocation: "",
          endLocation: "",
          startTime: "08:00",
          endTime: "18:00",
          daysOfWeek: [],
          vehicleType: "CAR",
          maxDistance: 10,
          minPrice: 15
        });
        await fetchRoutes();
      }
    } catch (error) {
      console.error('Error adding route:', error);
      toast.error("Erreur lors de l'ajout du trajet");
    }
  };

  const toggleRouteStatus = async (routeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(isActive ? "Trajet désactivé" : "Trajet activé");
        await fetchRoutes();
      }
    } catch (error) {
      console.error('Error toggling route status:', error);
      toast.error("Erreur lors de la modification du statut");
    }
  };

  const deleteRoute = async (routeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce trajet ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success("Trajet supprimé avec succès");
        await fetchRoutes();
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleDayOfWeek = (day: string) => {
    setNewRoute(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const formatDaysOfWeek = (days: string[]) => {
    return days.map(day => {
      const dayInfo = daysOfWeek.find(d => d.value === day);
      return dayInfo ? dayInfo.label : day;
    }).join(", ");
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
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
          <p className="text-gray-600">Chargement des trajets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes trajets"
        description="Gérez vos trajets réguliers pour recevoir des propositions de livraison"
      >
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un trajet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un trajet</DialogTitle>
              <DialogDescription>
                Définissez un trajet régulier pour recevoir des propositions de livraison
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="startLocation">Point de départ *</Label>
                <Input
                  id="startLocation"
                  value={newRoute.startLocation}
                  onChange={(e) => setNewRoute({...newRoute, startLocation: e.target.value})}
                  placeholder="Adresse de départ"
                />
              </div>

              <div>
                <Label htmlFor="endLocation">Destination *</Label>
                <Input
                  id="endLocation"
                  value={newRoute.endLocation}
                  onChange={(e) => setNewRoute({...newRoute, endLocation: e.target.value})}
                  placeholder="Adresse de destination"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure de départ</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newRoute.startTime}
                    onChange={(e) => setNewRoute({...newRoute, startTime: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">Heure d'arrivée</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newRoute.endTime}
                    onChange={(e) => setNewRoute({...newRoute, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Jours de la semaine *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={newRoute.daysOfWeek.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDayOfWeek(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="vehicleType">Type de véhicule</Label>
                <Select
                  value={newRoute.vehicleType}
                  onValueChange={(value) => setNewRoute({...newRoute, vehicleType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((vehicle) => (
                      <SelectItem key={vehicle.value} value={vehicle.value}>
                        {vehicle.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Distance maximale: {newRoute.maxDistance}km</Label>
                <Input
                  type="range"
                  min="1"
                  max="50"
                  value={newRoute.maxDistance}
                  onChange={(e) => setNewRoute({...newRoute, maxDistance: parseInt(e.target.value)})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Prix minimum: {newRoute.minPrice}€</Label>
                <Input
                  type="range"
                  min="5"
                  max="100"
                  value={newRoute.minPrice}
                  onChange={(e) => setNewRoute({...newRoute, minPrice: parseInt(e.target.value)})}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddRoute}>
                Ajouter le trajet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Trajets actifs</TabsTrigger>
          <TabsTrigger value="inactive">Trajets inactifs</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {routes.filter(route => route.isActive).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun trajet actif</p>
                <p className="text-sm text-gray-500">Ajoutez un trajet pour commencer à recevoir des propositions</p>
              </CardContent>
            </Card>
          ) : (
            routes.filter(route => route.isActive).map((route) => (
              <Card key={route.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{route.startLocation}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{route.endLocation}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(route.startTime)} - {formatTime(route.endTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDaysOfWeek(route.daysOfWeek)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">
                          <Truck className="h-3 w-3 mr-1" />
                          {vehicleTypes.find(v => v.value === route.vehicleType)?.label}
                        </Badge>
                        <span>Max {route.maxDistance}km</span>
                        <span>Min {route.minPrice}€</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRouteStatus(route.id, route.isActive)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Désactiver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRoute(route.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {routes.filter(route => !route.isActive).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun trajet inactif</p>
              </CardContent>
            </Card>
          ) : (
            routes.filter(route => !route.isActive).map((route) => (
              <Card key={route.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-600">{route.startLocation}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-600">{route.endLocation}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(route.startTime)} - {formatTime(route.endTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDaysOfWeek(route.daysOfWeek)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRouteStatus(route.id, route.isActive)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRoute(route.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}