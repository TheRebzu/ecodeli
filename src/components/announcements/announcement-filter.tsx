'use client';

import { useAnnouncement } from '@/hooks/use-announcement';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AnnouncementFiltersSchemaType } from '@/schemas/announcement.schema';
import { AnnouncementStatus, AnnouncementType } from '@/types/announcement';
import { useEffect, useState } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { announcementFiltersSchema } from '@/schemas/announcement.schema';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type FilterOption = {
  value: string;
  label: string;
};

export function AnnouncementFilter() {
  const t = useTranslations('announcements');
  const { filters, updateFilters, announcementTypes, announcementStatuses } = useAnnouncement();

  // État local pour la popover
  const [open, setOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Configuration du formulaire avec React Hook Form et Zod
  const form = useForm<AnnouncementFiltersSchemaType>({
    resolver: zodResolver(announcementFiltersSchema),
    defaultValues: { ...filters },
  });

  // Mettre à jour l'état des filtres actifs chaque fois que les filtres changent
  useEffect(() => {
    const newActiveFilters: string[] = [];

    if (filters.type) newActiveFilters.push('type');
    if (filters.status) newActiveFilters.push('status');
    if (filters.priority) newActiveFilters.push('priority');
    if (filters.fromDate) newActiveFilters.push('fromDate');
    if (filters.toDate) newActiveFilters.push('toDate');
    if (filters.minPrice !== undefined) newActiveFilters.push('minPrice');
    if (filters.maxPrice !== undefined) newActiveFilters.push('maxPrice');
    if (filters.keyword) newActiveFilters.push('keyword');
    if (filters.tags && filters.tags.length > 0) newActiveFilters.push('tags');

    setActiveFilters(newActiveFilters);
  }, [filters]);

  // Fonction pour appliquer les filtres
  const applyFilters = (data: AnnouncementFiltersSchemaType) => {
    updateFilters(data);
    setOpen(false);
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    form.reset({
      type: undefined,
      status: undefined,
      priority: undefined,
      fromDate: undefined,
      toDate: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      keyword: undefined,
      tags: undefined,
      limit: 10,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    updateFilters({
      type: undefined,
      status: undefined,
      priority: undefined,
      fromDate: undefined,
      toDate: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      keyword: undefined,
      tags: undefined,
      limit: 10,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    setOpen(false);
  };

  // Options de tri
  const sortOptions: FilterOption[] = [
    { value: 'createdAt', label: t('sortByCreationDate') },
    { value: 'updatedAt', label: t('sortByUpdateDate') },
    { value: 'suggestedPrice', label: t('sortByPrice') },
    { value: 'pickupDate', label: t('sortByPickupDate') },
    { value: 'deliveryDate', label: t('sortByDeliveryDate') },
  ];

  // Options d'ordre de tri
  const sortOrderOptions: FilterOption[] = [
    { value: 'desc', label: t('descending') },
    { value: 'asc', label: t('ascending') },
  ];

  return (
    <div className="border rounded-md mb-4">
      {/* Barre de filtres */}
      <div className="p-4 flex flex-wrap gap-2 items-center">
        {/* Filtres rapides */}
        <div className="flex-grow">
          <div className="flex flex-wrap gap-2">
            {/* Filtre par mot-clé */}
            <div className="relative w-full sm:w-auto">
              <Input
                placeholder={t('searchKeyword')}
                value={filters.keyword || ''}
                onChange={e => updateFilters({ keyword: e.target.value })}
                className="h-9 min-w-[200px]"
              />
              {filters.keyword && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => updateFilters({ keyword: undefined })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filtre par statut - version compacte */}
            <Select
              value={filters.status?.toString() || ''}
              onValueChange={value =>
                updateFilters({
                  status: value && value !== 'all' ? (value as AnnouncementStatus) : undefined,
                })
              }
            >
              <SelectTrigger className="w-auto h-9 min-w-[140px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                {announcementStatuses.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre par type - version compacte */}
            <Select
              value={filters.type?.toString() || ''}
              onValueChange={value =>
                updateFilters({
                  type: value && value !== 'all' ? (value as AnnouncementType) : undefined,
                })
              }
            >
              <SelectTrigger className="w-auto h-9 min-w-[140px]">
                <SelectValue placeholder={t('type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                {announcementTypes.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bouton de filtres avancés */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              {t('advancedFilters')}
              {activeFilters.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(applyFilters)}>
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">{t('filterAnnouncements')}</h3>

                  {/* Filtres par type et statut */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Type */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('type')}</FormLabel>
                          <Select
                            value={field.value?.toString() || ''}
                            onValueChange={value =>
                              field.onChange(
                                value && value !== 'all' ? (value as AnnouncementType) : undefined
                              )
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('allTypes')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">{t('allTypes')}</SelectItem>
                              {announcementTypes.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* Statut */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('status')}</FormLabel>
                          <Select
                            value={field.value?.toString() || ''}
                            onValueChange={value =>
                              field.onChange(
                                value && value !== 'all' ? (value as AnnouncementStatus) : undefined
                              )
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('allStatuses')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">{t('allStatuses')}</SelectItem>
                              {announcementStatuses.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Filtres de date */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date de début */}
                    <FormField
                      control={form.control}
                      name="fromDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('fromDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP', { locale: fr })
                                  ) : (
                                    <span>{t('selectDate')}</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />

                    {/* Date de fin */}
                    <FormField
                      control={form.control}
                      name="toDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('toDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP', { locale: fr })
                                  ) : (
                                    <span>{t('selectDate')}</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Filtres de prix */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Prix minimum */}
                    <FormField
                      control={form.control}
                      name="minPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('minPrice')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              min={0}
                              step={0.01}
                              value={field.value ?? ''}
                              onChange={e => {
                                const value =
                                  e.target.value !== '' ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Prix maximum */}
                    <FormField
                      control={form.control}
                      name="maxPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('maxPrice')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1000.00"
                              min={0}
                              step={0.01}
                              value={field.value ?? ''}
                              onChange={e => {
                                const value =
                                  e.target.value !== '' ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Options de tri */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Champ de tri */}
                    <FormField
                      control={form.control}
                      name="sortBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('sortBy')}</FormLabel>
                          <Select value={field.value || 'createdAt'} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* Ordre de tri */}
                    <FormField
                      control={form.control}
                      name="sortOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('sortOrder')}</FormLabel>
                          <Select value={field.value || 'desc'} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortOrderOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                      {t('resetFilters')}
                    </Button>
                    <Button type="submit" size="sm">
                      {t('applyFilters')}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </PopoverContent>
        </Popover>
      </div>

      {/* Affichage des filtres actifs */}
      {activeFilters.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {activeFilters.map(filter => {
            let label = '';
            let value = '';

            switch (filter) {
              case 'type':
                if (filters.type) {
                  const typeOption = announcementTypes.find(t => t.value === filters.type);
                  label = t('type');
                  value = typeOption?.label || filters.type;
                }
                break;
              case 'status':
                if (filters.status) {
                  const statusOption = announcementStatuses.find(s => s.value === filters.status);
                  label = t('status');
                  value = statusOption?.label || filters.status;
                }
                break;
              case 'fromDate':
                if (filters.fromDate) {
                  label = t('fromDate');
                  value = format(filters.fromDate, 'P', { locale: fr });
                }
                break;
              case 'toDate':
                if (filters.toDate) {
                  label = t('toDate');
                  value = format(filters.toDate, 'P', { locale: fr });
                }
                break;
              case 'minPrice':
                if (filters.minPrice !== undefined) {
                  label = t('minPrice');
                  value = `${filters.minPrice} €`;
                }
                break;
              case 'maxPrice':
                if (filters.maxPrice !== undefined) {
                  label = t('maxPrice');
                  value = `${filters.maxPrice} €`;
                }
                break;
              case 'keyword':
                if (filters.keyword) {
                  label = t('keyword');
                  value = filters.keyword;
                }
                break;
              default:
                break;
            }

            if (label && value) {
              return (
                <Badge key={filter} variant="outline" className="px-2 py-1">
                  <span className="font-medium mr-1">{label}:</span>
                  {value}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0"
                    onClick={() => updateFilters({ [filter]: undefined })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            }

            return null;
          })}

          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={resetFilters}>
              {t('clearAllFilters')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
