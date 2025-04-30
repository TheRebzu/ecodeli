'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { SearchIcon, FilterIcon } from 'lucide-react';
import { type ServiceSearchInput } from '@/schemas/service.schema';

interface ServiceSearchFormProps {
  initialValues?: Partial<ServiceSearchInput>;
  onSearch: (values: any) => void;
  className?: string;
}

/**
 * Formulaire de recherche de services
 * Permet de rechercher des services par type, localisation, date, prix, etc.
 */
export function ServiceSearchForm({ initialValues, onSearch, className }: ServiceSearchFormProps) {
  // Traductions
  const t = useTranslations('services.search');

  // État pour gérer l'affichage des filtres avancés
  const [showFilters, setShowFilters] = useState(false);

  // Configuration du formulaire avec React Hook Form et Zod
  const form = useForm({
    defaultValues: {
      type: initialValues?.type,
      keywords: initialValues?.keywords || '',
      page: initialValues?.page || 1,
      limit: initialValues?.limit || 10,
      dateRange: initialValues?.dateRange || undefined,
      priceRange: initialValues?.priceRange || {
        min: 0,
        max: 500,
      },
      location: initialValues?.location || undefined,
      sortBy: initialValues?.sortBy || 'price',
      sortOrder: initialValues?.sortOrder || 'asc',
    },
  });

  // Fonction de soumission du formulaire
  const handleSubmit = (values: any) => {
    onSearch(values);
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Barre de recherche principale */}
            <div className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder={t('placeholder')} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="min-w-[40px]"
              >
                <FilterIcon className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">{t('filters')}</span>
              </Button>
              <Button type="submit">{t('searchButton')}</Button>
            </div>

            {/* Filtres avancés */}
            {showFilters && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="filters">
                  <AccordionTrigger className="py-2">{t('filters')}</AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Type de service */}
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('category')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('category')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="TRANSPORT">Transport</SelectItem>
                                <SelectItem value="AIRPORT_TRANSFER">Transfert aéroport</SelectItem>
                                <SelectItem value="PET_SITTING">Garde d&apos;animaux</SelectItem>
                                <SelectItem value="HOUSEKEEPING">Entretien maison</SelectItem>
                                <SelectItem value="GARDENING">Jardinage</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Date */}
                      <FormField
                        control={form.control}
                        name="dateRange.from"
                        render={() => (
                          <FormItem>
                            <FormLabel>{t('date')}</FormLabel>
                            <FormControl>
                              <Controller
                                control={form.control}
                                name="dateRange.from"
                                render={({ field }) => (
                                  <DatePicker
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date: Date | undefined) =>
                                      field.onChange(date ? date.toISOString().split('T')[0] : '')
                                    }
                                    disabled={(date: Date) => date < new Date()}
                                    placeholder={t('date')}
                                  />
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Prix */}
                      <FormField
                        control={form.control}
                        name="priceRange"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel>{t('price')}</FormLabel>
                            <FormControl>
                              <div className="px-2">
                                <Slider
                                  defaultValue={[field.value?.min || 0, field.value?.max || 500]}
                                  min={0}
                                  max={500}
                                  step={10}
                                  onValueChange={values => {
                                    field.onChange({
                                      min: values[0],
                                      max: values[1],
                                    });
                                  }}
                                />
                                <div className="mt-2 flex items-center justify-between text-sm">
                                  <span>{field.value?.min || 0}€</span>
                                  <span>{field.value?.max || 500}€</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tri */}
                      <FormField
                        control={form.control}
                        name="sortBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('sortBy')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('sortBy')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="price">
                                  {t('sortOptions.priceLowToHigh')}
                                </SelectItem>
                                <SelectItem value="rating">{t('sortOptions.rating')}</SelectItem>
                                <SelectItem value="distance">
                                  {t('sortOptions.distance')}
                                </SelectItem>
                                <SelectItem value="date">{t('sortOptions.relevance')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sortOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ordre</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ordre" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="asc">Croissant</SelectItem>
                                <SelectItem value="desc">Décroissant</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-4 flex justify-between">
                      <Button type="button" variant="outline" onClick={() => form.reset()}>
                        {t('resetFilters')}
                      </Button>
                      <Button type="submit">{t('apply')}</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
