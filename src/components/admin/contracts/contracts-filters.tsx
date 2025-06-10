'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ContractFilters } from '@/hooks/admin/use-admin-contracts';

interface ContractsFiltersProps {
  filters: ContractFilters;
  onFiltersChange: (filters: Partial<ContractFilters>) => void;
  onClearFilters: () => void;
}

const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_SIGNATURE', label: 'En attente de signature' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'SUSPENDED', label: 'Suspendu' },
  { value: 'TERMINATED', label: 'Résilié' },
  { value: 'EXPIRED', label: 'Expiré' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const CONTRACT_TYPES = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'PARTNER', label: 'Partenaire' },
  { value: 'TRIAL', label: 'Essai' },
  { value: 'CUSTOM', label: 'Personnalisé' },
];

const MERCHANT_CATEGORIES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'GROCERY', label: 'Épicerie' },
  { value: 'PHARMACY', label: 'Pharmacie' },
  { value: 'FASHION', label: 'Mode' },
  { value: 'ELECTRONICS', label: 'Électronique' },
  { value: 'BOOKS', label: 'Librairie' },
  { value: 'BEAUTY', label: 'Beauté' },
  { value: 'SPORTS', label: 'Sport' },
  { value: 'OTHER', label: 'Autre' },
];

export function ContractsFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: ContractsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== ''
  ).length;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value || undefined });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ status: value === 'all' ? undefined : value });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({ type: value === 'all' ? undefined : value });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ merchantCategory: value === 'all' ? undefined : value });
  };

  const handleDateChange = (field: keyof ContractFilters, date: Date | undefined) => {
    onFiltersChange({ [field]: date });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Réduire' : 'Étendre'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, numéro ou commerçant..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtres de base */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {CONTRACT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type de contrat</Label>
            <Select
              value={filters.type || 'all'}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {CONTRACT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Catégorie commerçant</Label>
            <Select
              value={filters.merchantCategory || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {MERCHANT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtres avancés */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm text-muted-foreground">Filtres avancés</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Créé après le</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdAfter ? (
                        format(filters.createdAfter, 'PPP', { locale: fr })
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.createdAfter}
                      onSelect={(date) => handleDateChange('createdAfter', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Créé avant le</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdBefore ? (
                        format(filters.createdBefore, 'PPP', { locale: fr })
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.createdBefore}
                      onSelect={(date) => handleDateChange('createdBefore', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Résumé des filtres actifs */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Recherche: {filters.search}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Statut: {CONTRACT_STATUSES.find(s => s.value === filters.status)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleStatusChange('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 