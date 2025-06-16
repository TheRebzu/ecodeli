"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  MapPin, 
  Users, 
  Package, 
  AlertTriangle, 
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "@/hooks/use-toast";

interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  status: "active" | "inactive" | "maintenance";
  capacity: number;
  currentOccupancy: number;
  managerId?: string;
  managerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  services: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface WarehouseManagementProps {
  className?: string;
}

export function WarehouseManagement({ className }: WarehouseManagementProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Récupération des entrepôts depuis l'API
  const { data: warehouses, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-warehouses", searchTerm],
    queryFn: async () => {
      const response = await api.admin.warehouses.getAll.query({
        search: searchTerm || undefined,
      });
      return response;
    },
    staleTime: 30000,
  });

  // Mutation pour créer un entrepôt
  const createWarehouse = useMutation({
    mutationFn: async (data: Omit<Warehouse, "id" | "createdAt" | "updatedAt">) => {
      return await api.admin.warehouses.create.mutate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
      toast({
        title: "Succès",
        description: "Entrepôt créé avec succès",
      });
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entrepôt",
        variant: "destructive",
      });
    },
  });

  // Mutation pour mettre à jour un entrepôt
  const updateWarehouse = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Warehouse> }) => {
      return await api.admin.warehouses.update.mutate({ id, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
      toast({
        title: "Succès",
        description: "Entrepôt mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'entrepôt",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un entrepôt
  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      return await api.admin.warehouses.delete.mutate({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
      toast({
        title: "Succès",
        description: "Entrepôt supprimé avec succès",
      });
      setSelectedWarehouse(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrepôt",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: Warehouse["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: Warehouse["status"]) => {
    switch (status) {
      case "active":
        return "Actif";
      case "inactive":
        return "Inactif";
      case "maintenance":
        return "Maintenance";
      default:
        return "Inconnu";
    }
  };

  const getStatusIcon = (status: Warehouse["status"]) => {
    switch (status) {
      case "active":
        return CheckCircle;
      case "inactive":
        return XCircle;
      case "maintenance":
        return AlertTriangle;
      default:
        return AlertCircle;
    }
  };

  const calculateOccupancyPercentage = (warehouse: Warehouse) => {
    return Math.round((warehouse.currentOccupancy / warehouse.capacity) * 100);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Gestion des entrepôts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-32"></div>
                      <div className="h-3 bg-slate-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Gestion des entrepôts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des entrepôts. Veuillez réessayer.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => refetch()}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* En-tête avec recherche et actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Gestion des entrepôts
            </CardTitle>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel entrepôt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un entrepôt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des entrepôts */}
      {warehouses && warehouses.length > 0 ? (
        <div className="grid gap-4">
          {warehouses.map((warehouse) => {
            const StatusIcon = getStatusIcon(warehouse.status);
            const occupancyPercentage = calculateOccupancyPercentage(warehouse);
            
            return (
              <Card
                key={warehouse.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedWarehouse === warehouse.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedWarehouse(warehouse.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Building className="w-6 h-6 text-muted-foreground" />
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{warehouse.address}, {warehouse.city}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>{warehouse.currentOccupancy}/{warehouse.capacity}</span>
                            <span className="text-muted-foreground">
                              ({occupancyPercentage}%)
                            </span>
                          </div>
                          
                          {warehouse.managerName && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{warehouse.managerName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn("text-xs", getStatusColor(warehouse.status))}
                        variant="secondary"
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {getStatusLabel(warehouse.status)}
                      </Badge>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Ouvrir modal d'édition
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Êtes-vous sûr de vouloir supprimer cet entrepôt ?")) {
                              deleteWarehouse.mutate(warehouse.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Barre de progression de l'occupation */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Occupation</span>
                      <span className="font-medium">{occupancyPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          occupancyPercentage > 90 ? "bg-red-500" :
                          occupancyPercentage > 70 ? "bg-yellow-500" :
                          "bg-green-500"
                        )}
                        style={{ width: `${occupancyPercentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Building className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-gray-500 mb-2">
              {searchTerm ? "Aucun entrepôt trouvé" : "Aucun entrepôt configuré"}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {searchTerm 
                ? "Essayez de modifier vos critères de recherche"
                : "Créez votre premier entrepôt pour commencer"
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un entrepôt
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
