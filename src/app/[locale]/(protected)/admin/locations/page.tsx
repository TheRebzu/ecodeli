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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  Users,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Power,
  PowerOff,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface Warehouse {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  warehouse?: {
    id: string;
    capacity: number;
    currentOccupancy: number;
    managerName?: string;
    managerEmail?: string;
  };
  storageBoxes: StorageBox[];
  createdAt: string;
  updatedAt: string;
}

interface StorageBox {
  id: string;
  boxNumber: string;
  size: string;
  pricePerDay: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StorageBoxRental {
  id: string;
  clientId: string;
  startDate: string;
  endDate?: string;
  accessCode: string;
  totalPrice?: number;
  isPaid: boolean;
  client: {
    id: string;
    email: string;
    profile: {
      firstName?: string;
      lastName?: string;
    };
  };
}

const warehouseSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  address: z.string().min(5, "Adresse requise"),
  city: z.string().min(2, "Ville requise"),
  postalCode: z.string().min(4, "Code postal requis"),
  capacity: z.coerce.number().min(1, "Capacité requise"),
  managerName: z.string().optional(),
  managerEmail: z.string().email("Email invalide").optional(),
});

type WarehouseForm = z.infer<typeof warehouseSchema>;

export default function AdminLocationsPage() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxWarehouse, setBoxWarehouse] = useState<Warehouse | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [toggleStatusOpen, setToggleStatusOpen] = useState(false);
  const [toggleWarehouse, setToggleWarehouse] = useState<Warehouse | null>(
    null,
  );
  const form = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      postalCode: "",
      capacity: 1,
      managerName: "",
      managerEmail: "",
    },
  });
  const editForm = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      postalCode: "",
      capacity: 1,
      managerName: "",
      managerEmail: "",
    },
  });

  // Charger les entrepôts
  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (editWarehouse) {
      const w = editWarehouse;
      editForm.reset({
        name: w.name,
        address: w.address,
        city: w.city,
        postalCode: w.postalCode,
        capacity: w.warehouse?.capacity || 1,
        managerName: w.warehouse?.managerName || "",
        managerEmail: w.warehouse?.managerEmail || "",
      });
    }
  }, [editWarehouse]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/locations");
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les entrepôts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des entrepôts:", error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les entrepôts par recherche
  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculer les statistiques d'un entrepôt
  const getWarehouseStats = (warehouse: Warehouse) => {
    const totalBoxes = warehouse.storageBoxes.length;
    const availableBoxes = warehouse.storageBoxes.filter(
      (box) => box.isAvailable,
    ).length;
    const occupiedBoxes = warehouse.storageBoxes.filter(
      (box) => !box.isAvailable,
    ).length;
    const occupancyRate =
      totalBoxes > 0 ? Math.round((occupiedBoxes / totalBoxes) * 100) : 0;

    return {
      totalBoxes,
      availableBoxes,
      occupiedBoxes,
      occupancyRate,
    };
  };

  // Obtenir la couleur du badge selon le statut
  const getStatusColor = (isAvailable: boolean) => {
    return isAvailable
      ? "bg-green-100 text-green-800"
      : "bg-blue-100 text-blue-800";
  };

  // Obtenir la taille en français
  const getSizeLabel = (size: string) => {
    switch (size) {
      case "SMALL":
        return "Petite";
      case "MEDIUM":
        return "Moyenne";
      case "LARGE":
        return "Grande";
      case "EXTRA_LARGE":
        return "Très grande";
      default:
        return size;
    }
  };

  const handleCreateWarehouse = async (data: WarehouseForm) => {
    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast({
          title: "Entrepôt créé",
          description: "L'entrepôt a bien été ajouté.",
        });
        setOpen(false);
        form.reset();
        loadWarehouses();
      } else {
        const err = await response.json();
        toast({
          title: "Erreur",
          description: err.error || "Erreur inconnue",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur réseau",
        variant: "destructive",
      });
    }
  };

  const handleEditWarehouse = async (data: WarehouseForm) => {
    if (!editWarehouse) return;
    try {
      const response = await fetch(`/api/admin/locations/${editWarehouse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast({
          title: "Entrepôt modifié",
          description: "Les informations ont été mises à jour.",
        });
        setEditOpen(false);
        setEditWarehouse(null);
        loadWarehouses();
      } else {
        const err = await response.json();
        toast({
          title: "Erreur",
          description: err.error || "Erreur inconnue",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur réseau",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleWarehouse) return;
    try {
      const newStatus = !toggleWarehouse.isActive;
      const response = await fetch(
        `/api/admin/locations/${toggleWarehouse.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: newStatus }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        toast({
          title: newStatus ? "Entrepôt réactivé" : "Entrepôt fermé",
          description: data.message,
        });
        setToggleStatusOpen(false);
        setToggleWarehouse(null);
        loadWarehouses();
      } else {
        const err = await response.json();
        toast({
          title: "Erreur",
          description: err.error || "Erreur inconnue",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur réseau",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deleteWarehouse) return;
    try {
      const response = await fetch(
        `/api/admin/locations/${deleteWarehouse.id}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        const data = await response.json();
        toast({ title: "Entrepôt supprimé", description: data.message });
        setDeleteOpen(false);
        setDeleteWarehouse(null);
        loadWarehouses();
      } else {
        const err = await response.json();
        toast({
          title: "Erreur",
          description: err.error || "Erreur inconnue",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur réseau",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des entrepôts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emplacements</h1>
          <p className="text-muted-foreground">
            Gestion des entrepôts et box de stockage
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un entrepôt
        </Button>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un entrepôt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Entrepôts</p>
                <p className="text-2xl font-bold">{warehouses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Box</p>
                <p className="text-2xl font-bold">
                  {warehouses.reduce(
                    (total, warehouse) => total + warehouse.storageBoxes.length,
                    0,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Box Disponibles</p>
                <p className="text-2xl font-bold text-green-600">
                  {warehouses.reduce(
                    (total, warehouse) =>
                      total +
                      warehouse.storageBoxes.filter((box) => box.isAvailable)
                        .length,
                    0,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Box Occupées</p>
                <p className="text-2xl font-bold text-blue-600">
                  {warehouses.reduce(
                    (total, warehouse) =>
                      total +
                      warehouse.storageBoxes.filter((box) => !box.isAvailable)
                        .length,
                    0,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des entrepôts */}
      <div className="space-y-4">
        {filteredWarehouses.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Aucun entrepôt trouvé
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Aucun entrepôt ne correspond à votre recherche."
                    : "Aucun entrepôt n'a été créé."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredWarehouses.map((warehouse) => {
            const stats = getWarehouseStats(warehouse);

            return (
              <Card
                key={warehouse.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-xl">
                            {warehouse.name}
                          </CardTitle>
                          <Badge
                            variant={
                              warehouse.isActive ? "default" : "secondary"
                            }
                          >
                            {warehouse.isActive ? "Actif" : "Fermé"}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {warehouse.address}, {warehouse.city}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setToggleWarehouse(warehouse);
                          setToggleStatusOpen(true);
                        }}
                      >
                        {warehouse.isActive ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Fermer
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Réactiver
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditWarehouse(warehouse);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBoxWarehouse(warehouse);
                          setBoxOpen(true);
                        }}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Box
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteWarehouse(warehouse);
                          setDeleteOpen(true);
                        }}
                        disabled={!warehouse.isActive}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Statistiques de l'entrepôt */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.totalBoxes}</p>
                      <p className="text-sm text-muted-foreground">Total Box</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {stats.availableBoxes}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Disponibles
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.occupiedBoxes}
                      </p>
                      <p className="text-sm text-muted-foreground">Occupées</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {stats.occupancyRate}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Taux d'occupation
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Informations de l'entrepôt */}
                  {warehouse.warehouse?.managerName && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-2">
                        Informations de l'entrepôt
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Capacité:
                          </span>
                          <p className="font-medium">
                            {warehouse.warehouse?.capacity} colis
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Occupation actuelle:
                          </span>
                          <p className="font-medium">
                            {warehouse.warehouse?.currentOccupancy} colis
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Manager:
                          </span>
                          <p className="font-medium">
                            {warehouse.warehouse?.managerName}
                          </p>
                        </div>
                        {warehouse.warehouse?.managerEmail && (
                          <div>
                            <span className="text-muted-foreground">
                              Email:
                            </span>
                            <p className="font-medium">
                              {warehouse.warehouse?.managerEmail}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Liste des box */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-4">Box de stockage</h4>
                    {warehouse.storageBoxes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Aucune box configurée
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {warehouse.storageBoxes.map((box) => (
                          <div key={box.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">
                                Box {box.boxNumber}
                              </span>
                              <Badge
                                className={getStatusColor(box.isAvailable)}
                              >
                                {box.isAvailable ? "Disponible" : "Occupée"}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>Taille: {getSizeLabel(box.size)}</p>
                              <p>Prix: {box.pricePerDay}€/jour</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal création */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel entrepôt</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(handleCreateWarehouse)}
            className="space-y-4"
          >
            <div>
              <Label>Nom</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Adresse</Label>
              <Input {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ville</Label>
                <Input {...form.register("city")} />
                {form.formState.errors.city && (
                  <p className="text-red-500 text-xs">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Code postal</Label>
                <Input {...form.register("postalCode")} />
                {form.formState.errors.postalCode && (
                  <p className="text-red-500 text-xs">
                    {form.formState.errors.postalCode.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Capacité</Label>
              <Input
                type="number"
                min={1}
                {...form.register("capacity", { valueAsNumber: true })}
              />
              {form.formState.errors.capacity && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.capacity.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Manager</Label>
                <Input {...form.register("managerName")} />
              </div>
              <div>
                <Label>Email manager</Label>
                <Input {...form.register("managerEmail")} />
                {form.formState.errors.managerEmail && (
                  <p className="text-red-500 text-xs">
                    {form.formState.errors.managerEmail.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Créer</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal édition */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'entrepôt</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(handleEditWarehouse)}
            className="space-y-4"
          >
            <div>
              <Label>Nom</Label>
              <Input {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-red-500 text-xs">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Adresse</Label>
              <Input {...editForm.register("address")} />
              {editForm.formState.errors.address && (
                <p className="text-red-500 text-xs">
                  {editForm.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ville</Label>
                <Input {...editForm.register("city")} />
                {editForm.formState.errors.city && (
                  <p className="text-red-500 text-xs">
                    {editForm.formState.errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Code postal</Label>
                <Input {...editForm.register("postalCode")} />
                {editForm.formState.errors.postalCode && (
                  <p className="text-red-500 text-xs">
                    {editForm.formState.errors.postalCode.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Capacité</Label>
              <Input
                type="number"
                min={1}
                {...editForm.register("capacity", { valueAsNumber: true })}
              />
              {editForm.formState.errors.capacity && (
                <p className="text-red-500 text-xs">
                  {editForm.formState.errors.capacity.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Manager</Label>
                <Input {...editForm.register("managerName")} />
              </div>
              <div>
                <Label>Email manager</Label>
                <Input {...editForm.register("managerEmail")} />
                {editForm.formState.errors.managerEmail && (
                  <p className="text-red-500 text-xs">
                    {editForm.formState.errors.managerEmail.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Enregistrer</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Box */}
      <Dialog open={boxOpen} onOpenChange={setBoxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Box de stockage - {boxWarehouse?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {boxWarehouse?.storageBoxes.length === 0 ? (
              <p className="text-muted-foreground">Aucune box configurée</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {boxWarehouse?.storageBoxes.map((box) => (
                  <div key={box.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Box {box.boxNumber}</span>
                      <Badge className={getStatusColor(box.isAvailable)}>
                        {box.isAvailable ? "Disponible" : "Occupée"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Taille: {getSizeLabel(box.size)}</p>
                      <p>Prix: {box.pricePerDay}€/jour</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmation fermeture/réactivation */}
      <Dialog open={toggleStatusOpen} onOpenChange={setToggleStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleWarehouse?.isActive
                ? "Fermer temporairement"
                : "Réactiver"}{" "}
              l'entrepôt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {toggleWarehouse?.isActive
                ? "Êtes-vous sûr de vouloir fermer temporairement cet entrepôt ? Les clients ne pourront plus réserver de box."
                : "Êtes-vous sûr de vouloir réactiver cet entrepôt ? Il sera à nouveau disponible pour les réservations."}
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">{toggleWarehouse?.name}</h4>
              <p className="text-sm text-muted-foreground">
                {toggleWarehouse?.address}, {toggleWarehouse?.city}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleToggleStatus}
              variant={toggleWarehouse?.isActive ? "destructive" : "default"}
            >
              {toggleWarehouse?.isActive ? "Fermer" : "Réactiver"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmation suppression */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'entrepôt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Action irréversible</p>
            </div>
            <p className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement cet entrepôt ?
              Cette action supprimera également toutes les box de stockage
              associées.
            </p>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-medium mb-2 text-red-800">
                {deleteWarehouse?.name}
              </h4>
              <p className="text-sm text-red-600">
                {deleteWarehouse?.address}, {deleteWarehouse?.city}
              </p>
              <p className="text-sm text-red-600 mt-2">
                {deleteWarehouse?.storageBoxes.length} box de stockage seront
                également supprimées.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDeleteWarehouse} variant="destructive">
              Supprimer définitivement
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
