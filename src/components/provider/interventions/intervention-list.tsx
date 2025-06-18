"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wrench, 
  Calendar, 
  MapPin, 
  Clock,
  User,
  Phone,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Types pour les interventions
enum InterventionStatus {
  SCHEDULED = "SCHEDULED",
  CONFIRMED = "CONFIRMED", 
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

enum InterventionPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

interface Intervention {
  id: string;
  title: string;
  description: string;
  status: InterventionStatus;
  priority: InterventionPriority;
  scheduledDate: Date;
  estimatedDuration: number; // en minutes
  actualDuration?: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceType: string;
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
  price: number;
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface InterventionListProps {
  className?: string;
  onInterventionSelect?: (intervention: Intervention) => void;
  onInterventionCreate?: () => void;
  showActions?: boolean;
}

export default function InterventionList({ 
  className,
  onInterventionSelect,
  onInterventionCreate,
  showActions = true
}: InterventionListProps) {
  const t = useTranslations("provider.interventions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<InterventionPriority | "all">("all");
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);

  // Récupération des interventions via tRPC
  const { 
    data: interventions, 
    isLoading, 
    error,
    refetch 
  } = api.provider.interventions.getMyInterventions.useQuery({
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  });

  // Mutations pour gérer les interventions
  const updateStatusMutation = api.provider.interventions.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Statut mis à jour",
        description: "Le statut de l'intervention a été mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de mise à jour",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeInterventionMutation = api.provider.interventions.complete.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Intervention terminée",
        description: "L'intervention a été marquée comme terminée",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: InterventionStatus) => {
    switch (status) {
      case InterventionStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case InterventionStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case InterventionStatus.IN_PROGRESS:
        return <Clock className="w-4 h-4 text-blue-500" />;
      case InterventionStatus.CONFIRMED:
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case InterventionStatus.SCHEDULED:
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: InterventionStatus) => {
    const variants = {
      [InterventionStatus.COMPLETED]: "default",
      [InterventionStatus.CANCELLED]: "destructive",
      [InterventionStatus.IN_PROGRESS]: "secondary",
      [InterventionStatus.CONFIRMED]: "outline",
      [InterventionStatus.SCHEDULED]: "secondary",
    } as const;

    const labels = {
      [InterventionStatus.COMPLETED]: "Terminée",
      [InterventionStatus.CANCELLED]: "Annulée",
      [InterventionStatus.IN_PROGRESS]: "En cours",
      [InterventionStatus.CONFIRMED]: "Confirmée",
      [InterventionStatus.SCHEDULED]: "Planifiée",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: InterventionPriority) => {
    const variants = {
      [InterventionPriority.URGENT]: "destructive",
      [InterventionPriority.HIGH]: "default",
      [InterventionPriority.NORMAL]: "secondary",
      [InterventionPriority.LOW]: "outline",
    } as const;

    const labels = {
      [InterventionPriority.URGENT]: "Urgent",
      [InterventionPriority.HIGH]: "Élevée",
      [InterventionPriority.NORMAL]: "Normale",
      [InterventionPriority.LOW]: "Faible",
    };

    return (
      <Badge variant={variants[priority] || "secondary"} className="text-xs">
        {labels[priority]}
      </Badge>
    );
  };

  const handleStatusUpdate = (interventionId: string, newStatus: InterventionStatus) => {
    updateStatusMutation.mutate({ interventionId, status: newStatus });
  };

  const handleCompleteIntervention = (interventionId: string) => {
    completeInterventionMutation.mutate({ interventionId });
  };

  const filteredInterventions = interventions?.filter(intervention => {
    const matchesSearch = !searchQuery || 
      intervention.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intervention.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intervention.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || intervention.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || intervention.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des interventions: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes Interventions</h1>
          <p className="text-muted-foreground">
            Gérez vos interventions et rendez-vous clients
          </p>
        </div>
        {showActions && onInterventionCreate && (
          <Button onClick={onInterventionCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle intervention
          </Button>
        )}
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Titre, client, type de service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InterventionStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value={InterventionStatus.SCHEDULED}>Planifiée</SelectItem>
                  <SelectItem value={InterventionStatus.CONFIRMED}>Confirmée</SelectItem>
                  <SelectItem value={InterventionStatus.IN_PROGRESS}>En cours</SelectItem>
                  <SelectItem value={InterventionStatus.COMPLETED}>Terminée</SelectItem>
                  <SelectItem value={InterventionStatus.CANCELLED}>Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as InterventionPriority | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les priorités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les priorités</SelectItem>
                  <SelectItem value={InterventionPriority.URGENT}>Urgent</SelectItem>
                  <SelectItem value={InterventionPriority.HIGH}>Élevée</SelectItem>
                  <SelectItem value={InterventionPriority.NORMAL}>Normale</SelectItem>
                  <SelectItem value={InterventionPriority.LOW}>Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des interventions */}
      <Card>
        <CardHeader>
          <CardTitle>Interventions ({filteredInterventions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement des interventions...</span>
            </div>
          ) : filteredInterventions.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune intervention</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore d'interventions correspondant aux critères de recherche.
              </p>
              {onInterventionCreate && (
                <Button onClick={onInterventionCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Planifier votre première intervention
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intervention</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterventions.map((intervention) => (
                    <TableRow 
                      key={intervention.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        onInterventionSelect && "cursor-pointer"
                      )}
                      onClick={() => onInterventionSelect?.(intervention)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(intervention.status)}
                            <span className="font-medium">{intervention.title}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {intervention.serviceType}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{intervention.address.city}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{intervention.clientName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{intervention.clientPhone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(intervention.scheduledDate).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                            <span>({intervention.estimatedDuration}min)</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(intervention.status)}</TableCell>
                      <TableCell>{getPriorityBadge(intervention.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">{intervention.price.toFixed(2)}€</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Logique pour voir les détails
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Logique pour modifier
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {intervention.status === InterventionStatus.IN_PROGRESS && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteIntervention(intervention.id);
                              }}
                              disabled={completeInterventionMutation.isLoading}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      {filteredInterventions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{filteredInterventions.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredInterventions.filter(i => i.status === InterventionStatus.COMPLETED).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Terminées</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredInterventions.filter(i => i.status === InterventionStatus.IN_PROGRESS).length}
                  </div>
                  <div className="text-xs text-muted-foreground">En cours</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredInterventions
                      .filter(i => i.status === InterventionStatus.COMPLETED)
                      .reduce((sum, i) => sum + i.price, 0)
                      .toFixed(0)}€
                  </div>
                  <div className="text-xs text-muted-foreground">Revenus</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
