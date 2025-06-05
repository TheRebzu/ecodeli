'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronsUpDown, Filter, MapPin, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AnnouncementStatus } from '@prisma/client';

// Types du filtre
interface AnnouncementFilterProps {
  defaultValues?: Partial<AnnouncementFilterValues>;
  onFilterChange: (filters: AnnouncementFilterValues) => void;
  onReset?: () => void;
  isCompact?: boolean;
  className?: string;
}

interface AnnouncementFilterValues {
  search?: string;
  types?: string[];
  status?: AnnouncementStatus[];
  priceRange?: [number, number];
  distance?: number;
  dateRange?: [Date | null, Date | null];
  pickupLocation?: string;
  deliveryLocation?: string;
  hasPhotos?: boolean;
  isNegotiable?: boolean;
  requiresRefrigeration?: boolean;
  isFragile?: boolean;
  sortBy?: 'recent' | 'price_low' | 'price_high' | 'distance' | 'deadline';
}

const ANNOUNCEMENT_TYPES = [
  { value: 'PACKAGE_DELIVERY', label: 'Livraison de colis' },
  { value: 'GROCERY_SHOPPING', label: 'Courses alimentaires' },
  { value: 'PERSON_TRANSPORT', label: 'Transport de personnes' },
  { value: 'AIRPORT_TRANSFER', label: 'Transfert aéroport' },
  { value: 'FOREIGN_PURCHASE', label: "Achat à l'étranger" },
  { value: 'PET_CARE', label: "Transport d'animaux" },
  { value: 'HOME_SERVICES', label: 'Services à domicile' },
];

const ANNOUNCEMENT_STATUSES = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'PUBLISHED', label: 'Publiée' },
  { value: 'ASSIGNED', label: 'Assignée' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'price_low', label: 'Prix croissant' },
  { value: 'price_high', label: 'Prix décroissant' },
  { value: 'distance', label: 'Distance' },
  { value: 'deadline', label: 'Date limite' },
];

/**
 * Composant de filtre pour les annonces
 */
export function AnnouncementFilter({
  defaultValues = {},
  onFilterChange,
  onReset,
  isCompact = false,
  className,
}: AnnouncementFilterProps) {
  const t = useTranslations('Announcements.filters');

  // Initialisation des états à partir des valeurs par défaut
  const [filters, setFilters] = useState<AnnouncementFilterValues>({
    search: '',
    types: [],
    status: [],
    priceRange: [0, 1000],
    distance: 50,
    dateRange: [null, null],
    pickupLocation: '',
    deliveryLocation: '',
    hasPhotos: false,
    isNegotiable: false,
    requiresRefrigeration: false,
    isFragile: false,
    sortBy: 'recent',
    ...defaultValues,
  });

  // Gérer le changement d'état des filtres
  const handleFilterChange = (key: keyof AnnouncementFilterValues, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Utiliser setTimeout pour éviter d'appeler onFilterChange pendant le render
      setTimeout(() => {
        onFilterChange(newFilters);
      }, 0);
      return newFilters;
    });
  };

  // Réinitialiser les filtres
  const handleReset = () => {
    const resetFilters: AnnouncementFilterValues = {
      search: '',
      types: [],
      status: [],
      priceRange: [0, 1000] as [number, number],
      distance: 50,
      dateRange: [null, null] as [Date | null, Date | null],
      pickupLocation: '',
      deliveryLocation: '',
      hasPhotos: false,
      isNegotiable: false,
      requiresRefrigeration: false,
      isFragile: false,
      sortBy: 'recent' as const,
    };

    setFilters(resetFilters);
    // Utiliser setTimeout pour éviter d'appeler les callbacks pendant le render
    setTimeout(() => {
      if (onReset) {
        onReset();
      } else {
        onFilterChange(resetFilters);
      }
    }, 0);
  };

  // Version compacte du filtre (pour mobile)
  if (isCompact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex gap-2">
          <Input
            placeholder={t('search')}
            value={filters.search || ''}
            onChange={e => handleFilterChange('search', e.target.value)}
            className="flex-grow"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t('types')}</h3>
                  <div className="flex flex-wrap gap-1">
                    {ANNOUNCEMENT_TYPES.map(type => (
                      <Badge
                        key={type.value}
                        variant={filters.types?.includes(type.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = filters.types || [];
                          const updated = current.includes(type.value)
                            ? current.filter(t => t !== type.value)
                            : [...current, type.value];
                          handleFilterChange('types', updated);
                        }}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t('priceRange')}</h3>
                  <div className="pt-4">
                    <Slider
                      defaultValue={filters.priceRange}
                      min={0}
                      max={1000}
                      step={10}
                      value={filters.priceRange}
                      onValueChange={value => handleFilterChange('priceRange', value)}
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{filters.priceRange?.[0]}€</span>
                      <span>{filters.priceRange?.[1]}€</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t('distance')}</h3>
                  <div className="pt-4">
                    <Slider
                      defaultValue={[filters.distance || 50]}
                      min={1}
                      max={100}
                      step={1}
                      value={[filters.distance || 50]}
                      onValueChange={value => handleFilterChange('distance', value[0])}
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>1km</span>
                      <span>{filters.distance || 50}km</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t('options')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compact-has-photos"
                        checked={filters.hasPhotos}
                        onCheckedChange={checked =>
                          handleFilterChange('hasPhotos', checked === true)
                        }
                      />
                      <label
                        htmlFor="compact-has-photos"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t('hasPhotos')}
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compact-is-negotiable"
                        checked={filters.isNegotiable}
                        onCheckedChange={checked =>
                          handleFilterChange('isNegotiable', checked === true)
                        }
                      />
                      <label
                        htmlFor="compact-is-negotiable"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t('isNegotiable')}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t('sortBy')}</h3>
                  <Select
                    value={filters.sortBy}
                    onValueChange={value => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('sortByPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    {t('reset')}
                  </Button>
                  <Button size="sm" onClick={() => onFilterChange(filters)}>
                    {t('apply')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select
            value={filters.sortBy}
            onValueChange={value => handleFilterChange('sortBy', value as any)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('sortByPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags des filtres appliqués */}
        {(filters.types?.length ||
          filters.status?.length ||
          filters.hasPhotos ||
          filters.isNegotiable ||
          filters.priceRange?.[1] !== 1000 ||
          filters.distance !== 50) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.types?.map(type => (
              <Badge
                key={type}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  handleFilterChange('types', filters.types?.filter(t => t !== type) || []);
                }}
              >
                {ANNOUNCEMENT_TYPES.find(t => t.value === type)?.label}
                <button className="ml-1 font-mono text-xs">×</button>
              </Badge>
            ))}

            {filters.priceRange?.[1] !== 1000 && (
              <Badge variant="secondary" className="cursor-pointer">
                {t('price')}: {filters.priceRange?.[0]}€ - {filters.priceRange?.[1]}€
                <button
                  className="ml-1 font-mono text-xs"
                  onClick={() => handleFilterChange('priceRange', [0, 1000])}
                >
                  ×
                </button>
              </Badge>
            )}

            {filters.distance !== 50 && (
              <Badge variant="secondary" className="cursor-pointer">
                {t('distance')}: {filters.distance}km
                <button
                  className="ml-1 font-mono text-xs"
                  onClick={() => handleFilterChange('distance', 50)}
                >
                  ×
                </button>
              </Badge>
            )}

            {filters.hasPhotos && (
              <Badge variant="secondary" className="cursor-pointer">
                {t('hasPhotos')}
                <button
                  className="ml-1 font-mono text-xs"
                  onClick={() => handleFilterChange('hasPhotos', false)}
                >
                  ×
                </button>
              </Badge>
            )}

            {filters.isNegotiable && (
              <Badge variant="secondary" className="cursor-pointer">
                {t('isNegotiable')}
                <button
                  className="ml-1 font-mono text-xs"
                  onClick={() => handleFilterChange('isNegotiable', false)}
                >
                  ×
                </button>
              </Badge>
            )}

            {(filters.types?.length ||
              filters.status?.length ||
              filters.hasPhotos ||
              filters.isNegotiable ||
              filters.priceRange?.[1] !== 1000 ||
              filters.distance !== 50) && (
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-destructive/10"
                onClick={handleReset}
              >
                {t('reset')}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // Version complète du filtre (pour desktop)
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">{t('search')}</Label>
          <Input
            id="search"
            placeholder={t('searchPlaceholder')}
            value={filters.search || ''}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('types')}</Label>
          <div className="grid grid-cols-1 gap-2">
            {ANNOUNCEMENT_TYPES.map(type => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.value}`}
                  checked={filters.types?.includes(type.value)}
                  onCheckedChange={checked => {
                    const current = filters.types || [];
                    const updated = checked
                      ? [...current, type.value]
                      : current.filter(t => t !== type.value);
                    handleFilterChange('types', updated);
                  }}
                />
                <label
                  htmlFor={`type-${type.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('status')}</Label>
          <div className="grid grid-cols-1 gap-2">
            {ANNOUNCEMENT_STATUSES.map(status => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={filters.status?.includes(status.value as AnnouncementStatus)}
                  onCheckedChange={checked => {
                    const current = filters.status || [];
                    const updated = checked
                      ? [...current, status.value as AnnouncementStatus]
                      : current.filter(s => s !== status.value);
                    handleFilterChange('status', updated);
                  }}
                />
                <label
                  htmlFor={`status-${status.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {status.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="price">
            <AccordionTrigger>{t('priceRange')}</AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                <Slider
                  defaultValue={filters.priceRange}
                  min={0}
                  max={1000}
                  step={10}
                  value={filters.priceRange}
                  onValueChange={value => handleFilterChange('priceRange', value)}
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span>{filters.priceRange?.[0]}€</span>
                  <span>{filters.priceRange?.[1]}€</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="distance">
            <AccordionTrigger>{t('distance')}</AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                <Slider
                  defaultValue={[filters.distance || 50]}
                  min={1}
                  max={100}
                  step={1}
                  value={[filters.distance || 50]}
                  onValueChange={value => handleFilterChange('distance', value[0])}
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span>1km</span>
                  <span>{filters.distance || 50}km</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="location">
            <AccordionTrigger>{t('location')}</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {t('pickupLocation')}
                </Label>
                <Input
                  placeholder={t('pickupLocationPlaceholder')}
                  value={filters.pickupLocation || ''}
                  onChange={e => handleFilterChange('pickupLocation', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {t('deliveryLocation')}
                </Label>
                <Input
                  placeholder={t('deliveryLocationPlaceholder')}
                  value={filters.deliveryLocation || ''}
                  onChange={e => handleFilterChange('deliveryLocation', e.target.value)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="options">
            <AccordionTrigger>{t('options')}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-photos"
                    checked={filters.hasPhotos}
                    onCheckedChange={checked => handleFilterChange('hasPhotos', checked === true)}
                  />
                  <label
                    htmlFor="has-photos"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('hasPhotos')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-negotiable"
                    checked={filters.isNegotiable}
                    onCheckedChange={checked =>
                      handleFilterChange('isNegotiable', checked === true)
                    }
                  />
                  <label
                    htmlFor="is-negotiable"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('isNegotiable')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires-refrigeration"
                    checked={filters.requiresRefrigeration}
                    onCheckedChange={checked =>
                      handleFilterChange('requiresRefrigeration', checked === true)
                    }
                  />
                  <label
                    htmlFor="requires-refrigeration"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('requiresRefrigeration')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-fragile"
                    checked={filters.isFragile}
                    onCheckedChange={checked => handleFilterChange('isFragile', checked === true)}
                  />
                  <label
                    htmlFor="is-fragile"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('isFragile')}
                  </label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sort">
            <AccordionTrigger>{t('sortBy')}</AccordionTrigger>
            <AccordionContent>
              <RadioGroup
                value={filters.sortBy}
                onValueChange={value => handleFilterChange('sortBy', value)}
              >
                {SORT_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                    <label
                      htmlFor={`sort-${option.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          {t('reset')}
        </Button>
        <Button onClick={() => onFilterChange(filters)}>{t('apply')}</Button>
      </CardFooter>
    </Card>
  );
}

export default AnnouncementFilter;
