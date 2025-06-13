"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search, Filter, RotateCcw } from "lucide-react";

type ServiceStatus = "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
type ServiceCategory =
  | "DELIVERY"
  | "CLEANING"
  | "MAINTENANCE"
  | "REPAIR"
  | "OTHER";

interface ServiceFilters {
  search?: string;
  status?: ServiceStatus;
  category?: ServiceCategory;
  page?: number;
  limit?: number;
}

interface ServicesFiltersProps {
  filters: ServiceFilters;
  onFiltersChange: (filters: Partial<ServiceFilters>) => void;
  onReset: () => void;
  categories?: Array<{
    id: string;
    name: string;
    servicesCount: number;
  }>;
  isLoading?: boolean;
}

const statusOptions = [
  { value: "ACTIVE", label: "Actif", color: "bg-green-100 text-green-800" },
  { value: "INACTIVE", label: "Inactif", color: "bg-gray-100 text-gray-800" },
  {
    value: "DRAFT",
    label: "Brouillon",
    color: "bg-yellow-100 text-yellow-800",
  },
  { value: "SUSPENDED", label: "Suspendu", color: "bg-red-100 text-red-800" },
] as const;

const categoryOptions = [
  { value: "DELIVERY", label: "Livraison" },
  { value: "CLEANING", label: "Nettoyage" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "REPAIR", label: "Réparation" },
  { value: "OTHER", label: "Autre" },
] as const;

export function ServicesFilters({
  filters,
  onFiltersChange,
  onReset,
  categories,
  isLoading,
}: ServicesFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ search: localSearch, page: 1 });
  };

  const handleStatusChange = (status: string) => {
    if (status === "all") {
      onFiltersChange({ status: undefined, page: 1 });
    } else {
      onFiltersChange({ status: status as ServiceStatus, page: 1 });
    }
  };

  const handleCategoryChange = (category: string) => {
    if (category === "all") {
      onFiltersChange({ category: undefined, page: 1 });
    } else {
      onFiltersChange({ category: category as ServiceCategory, page: 1 });
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status) count++;
    if (filters.category) count++;
    return count;
  };

  const getStatusBadge = (status: ServiceStatus) => {
    const option = statusOptions.find((opt) => opt.value === status);
    return option ? (
      <Badge variant="outline" className={option.color}>
        {option.label}
      </Badge>
    ) : null;
  };

  const getCategoryLabel = (category: ServiceCategory) => {
    const option = categoryOptions.find((opt) => opt.value === category);
    return option?.label || category;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          {getActiveFiltersCount() > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche textuelle */}
        <div className="space-y-2">
          <Label htmlFor="search">Rechercher</Label>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nom du service, description..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" size="sm" disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Filtres par statut et catégorie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={handleStatusChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={handleCategoryChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Affichage des filtres actifs */}
        {getActiveFiltersCount() > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Filtres actifs</Label>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />"{filters.search}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => {
                      setLocalSearch("");
                      onFiltersChange({ search: undefined, page: 1 });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}

              {filters.status && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Statut: {getStatusBadge(filters.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() =>
                      onFiltersChange({ status: undefined, page: 1 })
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}

              {filters.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Catégorie: {getCategoryLabel(filters.category)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() =>
                      onFiltersChange({ category: undefined, page: 1 })
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
