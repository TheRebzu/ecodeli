"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  Clock,
  Euro,
  MapPin,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";

interface ProviderServicesManagerProps {
  providerId: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration?: number;
  isActive: boolean;
  requirements: string[];
  minAdvanceBooking: number;
  maxAdvanceBooking: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceForm {
  name: string;
  description: string;
  type: string;
  basePrice: number;
  priceUnit: string;
  duration: number;
  isActive: boolean;
  requirements: string[];
  minAdvanceBooking: number;
  maxAdvanceBooking: number;
}

const serviceCategories = [
  { value: "PERSON_TRANSPORT", label: "Transport de personnes", icon: "🚗" },
  { value: "AIRPORT_TRANSFER", label: "Transfert aéroport", icon: "✈️" },
  { value: "SHOPPING", label: "Courses", icon: "🛒" },
  {
    value: "INTERNATIONAL_PURCHASE",
    label: "Achats internationaux",
    icon: "🌍",
  },
  { value: "PET_CARE", label: "Garde d'animaux", icon: "🐕" },
  { value: "HOME_SERVICE", label: "Services à domicile", icon: "🏠" },
  { value: "CART_DROP", label: "Lâcher de chariot", icon: "🛒" },
  { value: "OTHER", label: "Autre", icon: "⚡" },
];

const priceUnits = [
  { value: "HOUR", label: "Par heure" },
  { value: "FLAT", label: "Forfait" },
  { value: "DAY", label: "Par jour" },
  { value: "KM", label: "Par kilomètre" },
];

export default function ProviderServicesManager({
  providerId,
}: ProviderServicesManagerProps) {
  const t = useTranslations("provider.services");
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [serviceForm, setServiceForm] = useState<ServiceForm>({
    name: "",
    description: "",
    type: "",
    basePrice: 0,
    priceUnit: "HOUR",
    duration: 60,
    isActive: true,
    requirements: [],
    minAdvanceBooking: 24,
    maxAdvanceBooking: 720,
  });

  useEffect(() => {
    fetchServices();
  }, [providerId]);

  const fetchServices = async () => {
    try {
      const response = await fetch(
        `/api/provider/services?providerId=${providerId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async () => {
    try {
      const response = await fetch("/api/provider/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          ...serviceForm,
        }),
      });

      if (response.ok) {
        await fetchServices();
        setShowCreateDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating service:", error);
    }
  };

  const handleEditService = async () => {
    if (!editingService) return;

    try {
      const response = await fetch(
        `/api/provider/services/${editingService.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...serviceForm,
          }),
        },
      );

      if (response.ok) {
        await fetchServices();
        setShowEditDialog(false);
        setEditingService(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) return;

    try {
      const response = await fetch(`/api/provider/services/${serviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchServices();
      }
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/provider/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        await fetchServices();
      }
    } catch (error) {
      console.error("Error toggling service status:", error);
    }
  };

  const resetForm = () => {
    setServiceForm({
      name: "",
      description: "",
      type: "",
      basePrice: 0,
      priceUnit: "HOUR",
      duration: 60,
      isActive: true,
      requirements: [],
      minAdvanceBooking: 24,
      maxAdvanceBooking: 720,
    });
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      type: service.category,
      basePrice: service.price,
      priceUnit: "HOUR",
      duration: service.duration || 60,
      isActive: service.isActive,
      requirements: service.requirements,
      minAdvanceBooking: service.minAdvanceBooking,
      maxAdvanceBooking: service.maxAdvanceBooking,
    });
    setShowEditDialog(true);
  };

  const getCategoryInfo = (category: string) => {
    return (
      serviceCategories.find((cat) => cat.value === category) || {
        value: category,
        label: category,
        icon: "⚡",
      }
    );
  };

  const formatPrice = (price: number, unit: string = "HOUR") => {
    const unitLabel =
      priceUnits.find((u) => u.value === unit)?.label || "Par heure";
    return `${price}€ ${unitLabel}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des services...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Services totaux</p>
                <p className="text-2xl font-bold">{services.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Services actifs</p>
                <p className="text-2xl font-bold">
                  {services.filter((s) => s.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Euro className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prix moyen</p>
                <p className="text-2xl font-bold">
                  {services.length > 0
                    ? `${Math.round(services.reduce((acc, s) => acc + s.price, 0) / services.length)}€`
                    : "0€"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durée moyenne</p>
                <p className="text-2xl font-bold">
                  {services.filter((s) => s.duration).length > 0
                    ? `${Math.round(services.filter((s) => s.duration).reduce((acc, s) => acc + (s.duration || 0), 0) / services.filter((s) => s.duration).length)}min`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions et filtres */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mes Services</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau service</DialogTitle>
              <DialogDescription>
                Définissez les détails de votre nouveau service
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du service</Label>
                  <Input
                    id="name"
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, name: e.target.value })
                    }
                    placeholder="Ex: Ménage à domicile"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={serviceForm.type}
                    onValueChange={(value) =>
                      setServiceForm({ ...serviceForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Décrivez votre service en détail"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Prix</Label>
                  <Input
                    id="price"
                    type="number"
                    value={serviceForm.basePrice}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        basePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="priceUnit">Unité</Label>
                  <Select
                    value={serviceForm.priceUnit}
                    onValueChange={(value) =>
                      setServiceForm({ ...serviceForm, priceUnit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priceUnits.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Durée (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={serviceForm.duration}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        duration: parseInt(e.target.value) || 60,
                      })
                    }
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAdvance">Délai min (heures)</Label>
                  <Input
                    id="minAdvance"
                    type="number"
                    value={serviceForm.minAdvanceBooking}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        minAdvanceBooking: parseInt(e.target.value) || 24,
                      })
                    }
                    placeholder="24"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAdvance">Délai max (heures)</Label>
                  <Input
                    id="maxAdvance"
                    type="number"
                    value={serviceForm.maxAdvanceBooking}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        maxAdvanceBooking: parseInt(e.target.value) || 720,
                      })
                    }
                    placeholder="720"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={serviceForm.isActive}
                  onCheckedChange={(checked) =>
                    setServiceForm({ ...serviceForm, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Service actif</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleCreateService}>Créer le service</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des services */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({services.length})</CardTitle>
          <CardDescription>
            Gérez vos services et leurs paramètres
          </CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun service</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre premier service
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => {
                  const categoryInfo = getCategoryInfo(service.category);
                  return (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.description.length > 50
                              ? `${service.description.substring(0, 50)}...`
                              : service.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {categoryInfo.icon} {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatPrice(service.price)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {service.duration
                          ? `${service.duration} min`
                          : "Variable"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={service.isActive ? "default" : "secondary"}
                          >
                            {service.isActive ? "Actif" : "Inactif"}
                          </Badge>
                          <Switch
                            checked={service.isActive}
                            onCheckedChange={(checked) =>
                              handleToggleActive(service.id, checked)
                            }
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(service)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteService(service.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le service</DialogTitle>
            <DialogDescription>
              Modifiez les détails de votre service
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Même formulaire que pour la création */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nom du service</Label>
                <Input
                  id="edit-name"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, name: e.target.value })
                  }
                  placeholder="Ex: Ménage à domicile"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Catégorie</Label>
                <Select
                  value={serviceForm.type}
                  onValueChange={(value) =>
                    setServiceForm({ ...serviceForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    description: e.target.value,
                  })
                }
                placeholder="Décrivez votre service en détail"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-price">Prix</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={serviceForm.basePrice}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-priceUnit">Unité</Label>
                <Select
                  value={serviceForm.priceUnit}
                  onValueChange={(value) =>
                    setServiceForm({ ...serviceForm, priceUnit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priceUnits.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-duration">Durée (min)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={serviceForm.duration}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      duration: parseInt(e.target.value) || 60,
                    })
                  }
                  placeholder="60"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={serviceForm.isActive}
                onCheckedChange={(checked) =>
                  setServiceForm({ ...serviceForm, isActive: checked })
                }
              />
              <Label htmlFor="edit-isActive">Service actif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditService}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
