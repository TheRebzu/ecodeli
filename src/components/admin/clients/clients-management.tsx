"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Filter,
  Search,
  Download
} from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

interface Client {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  joinDate: string;
  totalOrders: number;
}

export default function ClientsManagement() {
  const t = useTranslations("admin.clients");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Récupération des données via tRPC
  const { 
    data: clientsData, 
    isLoading: isLoadingClients, 
    error: clientsError,
    refetch: refetchClients
  } = api.admin.getClients.useQuery({
    page: 1,
    limit: 50,
    search: searchQuery || undefined,
    status: statusFilter !== "ALL" ? statusFilter as "ACTIVE" | "INACTIVE" | "SUSPENDED" : undefined
  });

  const { 
    data: clientStats, 
    isLoading: isLoadingStats 
  } = api.admin.getClientStats.useQuery();

  // Actions de gestion des clients
  const updateClientStatusMutation = api.admin.updateClientStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Statut du client mis à jour avec succès",
      });
      refetchClients();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportClientsMutation = api.admin.exportClients.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier généré
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export réussi",
        description: "Les données clients ont été exportées avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur d'export",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportClientsMutation.mutate({
      format: 'CSV',
      filters: {
        search: searchQuery || undefined,
        status: statusFilter !== "ALL" ? statusFilter as "ACTIVE" | "INACTIVE" | "SUSPENDED" : undefined
      }
    });
  };

  const handleStatusChange = (clientId: string, newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED") => {
    updateClientStatusMutation.mutate({
      clientId,
      status: newStatus,
      reason: `Changement de statut vers ${newStatus}`
    });
  };

  const getStatusColor = (status: Client["status"]) => {
    switch (status) {
      case "ACTIVE": return "text-green-600 bg-green-100";
      case "INACTIVE": return "text-gray-600 bg-gray-100";
      case "SUSPENDED": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  // Gestion des erreurs
  if (clientsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-destructive">Erreur lors du chargement des clients: {clientsError.message}</p>
          <Button onClick={() => refetchClients()} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const clients = clientsData?.clients || [];
  const stats = clientStats || {
    activeClients: 0,
    newClientsThisWeek: 0,
    suspendedClients: 0,
    totalClients: 0
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des clients</h1>
          <p className="text-muted-foreground">
            Gérez et surveillez tous les clients de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={exportClientsMutation.isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportClientsMutation.isLoading ? "Export..." : "Exporter"}
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clients actifs
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : stats.activeClients.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {stats.totalClients} clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nouveaux clients
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : stats.newClientsThisWeek}
            </div>
            <p className="text-xs text-muted-foreground">
              Cette semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clients suspendus
            </CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : stats.suspendedClients}
            </div>
            <p className="text-xs text-muted-foreground">
              À vérifier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Rechercher un client..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIVE">Actifs</option>
                <option value="INACTIVE">Inactifs</option>
                <option value="SUSPENDED">Suspendus</option>
              </select>
            </div>

            {isLoadingClients ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement des clients...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun client trouvé</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {client.totalOrders} commandes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inscrit le {new Date(client.joinDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                      <div className="flex gap-2">
                        {client.status !== "ACTIVE" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusChange(client.id, "ACTIVE")}
                            disabled={updateClientStatusMutation.isLoading}
                          >
                            Activer
                          </Button>
                        )}
                        {client.status === "ACTIVE" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusChange(client.id, "SUSPENDED")}
                            disabled={updateClientStatusMutation.isLoading}
                          >
                            Suspendre
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Voir détails
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 