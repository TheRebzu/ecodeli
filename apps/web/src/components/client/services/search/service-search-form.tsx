'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Search, Filter, MapPin, Euro, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/common';

// Schéma de validation pour la recherche
const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  availability: z.string().optional(),
  rating: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface ServiceSearchFormProps {
  onSearch: (values: SearchFormValues) => void;
  className?: string;
  defaultValues?: Partial<SearchFormValues>;
}

// Catégories de services disponibles
const SERVICE_CATEGORIES = [
  { value: 'cleaning', label: 'Ménage' },
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electrical', label: 'Électricité' },
  { value: 'gardening', label: 'Jardinage' },
  { value: 'painting', label: 'Peinture' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'beauty', label: 'Beauté' },
  { value: 'wellness', label: 'Bien-être' },
];

// Options de disponibilité
const AVAILABILITY_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'tomorrow', label: 'Demain' },
  { value: 'this_week', label: 'Cette semaine' },
  { value: 'next_week', label: 'Semaine prochaine' },
  { value: 'flexible', label: 'Flexible' },
];

/**
 * Formulaire de recherche de services
 */
export function ServiceSearchForm({ onSearch, className, defaultValues }: ServiceSearchFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations('services.search');

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: '',
      category: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      availability: '',
      rating: '',
      ...defaultValues,
    },
  });

  const handleSubmit = (values: SearchFormValues) => {
    onSearch(values);
  };

  const handleReset = () => {
    form.reset({
      query: '',
      category: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      availability: '',
      rating: '',
    });
    onSearch({});
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('title')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Recherche principale */}
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('query')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('queryPlaceholder')}
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Localisation */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('location')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('locationPlaceholder')}
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Filtres avancés */}
            <div className={cn('space-y-4', !isExpanded && 'hidden md:block')}>
              {/* Catégorie */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('categoryPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t('allCategories')}</SelectItem>
                        {SERVICE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fourchette de prix */}
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="minPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('minPrice')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('maxPrice')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="1000"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Disponibilité */}
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('availability')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('availabilityPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t('anyTime')}</SelectItem>
                        {AVAILABILITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note minimale */}
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('minRating')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('ratingPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">{t('anyRating')}</SelectItem>
                        <SelectItem value="4">4+ ⭐</SelectItem>
                        <SelectItem value="3">3+ ⭐</SelectItem>
                        <SelectItem value="2">2+ ⭐</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                {t('search')}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                {t('reset')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 