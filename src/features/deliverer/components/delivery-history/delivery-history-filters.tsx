import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, RotateCcw } from "lucide-react";

interface DeliveryHistoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter?: string;
  onTypeChange?: (value: string) => void;
  onReset: () => void;
}

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "IN_TRANSIT", label: "En cours" },
  { value: "DELIVERED", label: "Livrée" },
  { value: "CANCELLED", label: "Annulée" },
];

const typeOptions = [
  { value: "all", label: "Tous les types" },
  { value: "PACKAGE_DELIVERY", label: "Livraison de colis" },
  { value: "PERSON_TRANSPORT", label: "Transport de personne" },
  { value: "AIRPORT_TRANSFER", label: "Transfert aéroport" },
  { value: "SHOPPING", label: "Courses" },
  { value: "INTERNATIONAL_PURCHASE", label: "Achat international" },
  { value: "PET_SITTING", label: "Garde d'animal" },
  { value: "HOME_SERVICE", label: "Service à domicile" },
  { value: "CART_DROP", label: "Lâcher de chariot" },
];

export function DeliveryHistoryFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  onReset,
}: DeliveryHistoryFiltersProps) {
  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    (typeFilter && typeFilter !== "all");

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Titre des filtres */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Filtres</span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Filtres principaux */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par titre, client ou numéro de suivi..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtre par statut */}
            <div>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par type (optionnel) */}
            {onTypeChange && (
              <div>
                <Select
                  value={typeFilter || "all"}
                  onValueChange={onTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Indicateurs des filtres actifs */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500">Filtres actifs:</span>

              {searchTerm && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  <Search className="h-3 w-3" />
                  <span>"{searchTerm}"</span>
                  <button
                    onClick={() => onSearchChange("")}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </div>
              )}

              {statusFilter !== "all" && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  <span>
                    Statut:{" "}
                    {statusOptions.find((s) => s.value === statusFilter)?.label}
                  </span>
                  <button
                    onClick={() => onStatusChange("all")}
                    className="ml-1 hover:text-green-900"
                  >
                    ×
                  </button>
                </div>
              )}

              {typeFilter && typeFilter !== "all" && onTypeChange && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                  <span>
                    Type:{" "}
                    {typeOptions.find((t) => t.value === typeFilter)?.label}
                  </span>
                  <button
                    onClick={() => onTypeChange("all")}
                    className="ml-1 hover:text-purple-900"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
