'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterX, Search } from 'lucide-react';
import { AnnouncementStatus } from '@/types/announcement';

// Schéma de validation pour les filtres
const filterSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  sortBy: z.string().optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

interface AnnouncementFilterProps {
  onFiltersChange: (filters: FilterFormData) => void;
  activeFilters?: FilterFormData;
  isLoading?: boolean;
}

export function AnnouncementFilter({ 
  onFiltersChange, 
  activeFilters = {},
  isLoading = false 
}: AnnouncementFilterProps) {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: activeFilters,
  });

  const handleSubmit = (data: FilterFormData) => {
    onFiltersChange(data);
  };

  const handleReset = () => {
    form.reset({});
    onFiltersChange({});
  };

  const getActiveFiltersCount = () => {
    return Object.values(activeFilters).filter(Boolean).length;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtres de recherche</CardTitle>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFiltersCount()} filtre(s) actif(s)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Recherche textuelle */}
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recherche</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="Rechercher une annonce..."
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Statut */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Tous les statuts</SelectItem>
                        <SelectItem value="DRAFT">Brouillon</SelectItem>
                        <SelectItem value="PUBLISHED">Publié</SelectItem>
                        <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                        <SelectItem value="COMPLETED">Terminé</SelectItem>
                        <SelectItem value="CANCELLED">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Tri */}
              <FormField
                control={form.control}
                name="sortBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trier par</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Date de création" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="createdAt">Date de création</SelectItem>
                        <SelectItem value="updatedAt">Dernière modification</SelectItem>
                        <SelectItem value="amount">Montant</SelectItem>
                        <SelectItem value="title">Titre</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Fourchette de prix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant minimum (€)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant maximum (€)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="1000"
                        min="0"
                        step="0.01"
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                Appliquer les filtres
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                disabled={isLoading}
                className="flex-1 sm:flex-initial"
              >
                <FilterX className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Export par défaut pour compatibilité
export default AnnouncementFilter;
