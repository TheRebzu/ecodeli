"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DownloadIcon,
  PlusIcon,
  UsersIcon,
  EyeIcon,
  EditIcon,
  BanIcon,
  LoaderIcon,
  RefreshCcwIcon,
  Briefcase,
  Package,
  Award,
  Star,
  Wrench,
  CheckCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAdminProviders } from "@/hooks/admin/use-admin-providers";

// Types
interface Provider {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  services: string[];
  rating: number;
  completedJobs: number;
  createdAt: Date;
  lastActivity?: Date;
  monthlyRevenue: number;
}

// Fonctions utilitaires
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
};

export default function ProvidersManagement() {
  const t = useTranslations("admin.providers");
  
  // États locaux pour les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Hook personnalisé pour la gestion des prestataires
  const {
    providers,
    total,
    stats,
    filters,
    isLoadingProviders,
    isLoadingStats,
    isUpdatingStatus,
    isExporting,
    error,
    updateFilters,
    handleStatusChange,
    handleExport,
    refetchProviders,
  } = useAdminProviders({
    search: searchTerm,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  // Fonctions d'aide
  const getStatusColor = (status: Provider["status"]) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "suspended":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: Provider["status"]) => {
    switch (status) {
      case "approved":
        return "Approuvé";
      case "pending":
        return "En attente";
      case "rejected":
        return "Rejeté";
      case "suspended":
        return "Suspendu";
      default:
        return "Inconnu";
    }
  };

  const getStatusIcon = (status: Provider["status"]) => {
    switch (status) {
      case "approved":
        return CheckCircle;
      case "pending":
        return Clock;
      case "rejected":
      case "suspended":
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-3 h-3",
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        ))}
        <span className="text-xs ml-1 text-muted-foreground">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  // Gestionnaires d'événements
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateFilters({ search: value });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    updateFilters({ status: value });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateFilters({ sortBy: value });
  };

  const handleExportClick = () => {
    handleExport({ search: searchTerm, status: statusFilter });
  };

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Erreur de chargement
              </h3>
              <p className="text-muted-foreground mb-4">
                Impossible de charger les données des prestataires
              </p>
              <Button onClick={() => refetchProviders()}>
                <RefreshCcwIcon className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des prestataires</h1>
          <p className="text-muted-foreground">
            Gérez les prestataires de services inscrits sur la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportClick}
            disabled={isExporting}
          >
            {isExporting ? (
              <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <DownloadIcon className="w-4 h-4 mr-2" />
            )}
            Exporter
          </Button>
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouveau prestataire
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total prestataires
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Approuvés
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.approved}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    En attente
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Chiffre d'affaires
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un prestataire..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date de création</SelectItem>
                <SelectItem value="businessName">Nom</SelectItem>
                <SelectItem value="rating">Note</SelectItem>
                <SelectItem value="monthlyRevenue">Chiffre d'affaires</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des prestataires */}
      <Card>
        <CardHeader>
          <CardTitle>
            Liste des prestataires ({providers.length})
          </CardTitle>
          <CardDescription>
            Gérez et modifiez les prestataires inscrits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProviders ? (
            <div className="text-center py-8">
              <LoaderIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Chargement des prestataires...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun prestataire</h3>
              <p className="text-muted-foreground mb-4">
                Aucun prestataire ne correspond à vos critères de recherche.
              </p>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Ajouter un prestataire
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>CA mensuel</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const StatusIcon = getStatusIcon(provider.status);
                  return (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{provider.businessName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {provider.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{provider.ownerName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {provider.email}
                          </div>
                          {provider.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3" />
                              {provider.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {provider.services.slice(0, 2).map((service) => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                          {provider.services.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{provider.services.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <Badge className={getStatusColor(provider.status)}>
                            {getStatusLabel(provider.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{renderStars(provider.rating)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatCurrency(provider.monthlyRevenue)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {provider.completedJobs} missions
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/providers/${provider.id}`}>
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/providers/${provider.id}/edit`}>
                              <EditIcon className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Select
                            value={provider.status}
                            onValueChange={(value) =>
                              handleStatusChange(provider.id, value)
                            }
                            disabled={isUpdatingStatus}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                En attente
                              </SelectItem>
                              <SelectItem value="approved">
                                Approuvé
                              </SelectItem>
                              <SelectItem value="rejected">
                                Rejeté
                              </SelectItem>
                              <SelectItem value="suspended">
                                Suspendu
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 