'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Calendar as CalendarIcon, Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';

const DeliveryStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  PROBLEM: 'PROBLEM',
} as const;

const deliveryFilterSchema = z.object({
  status: z.string().optional(),
  searchTerm: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type DeliveryFilterValues = z.infer<typeof deliveryFilterSchema>;

interface DeliveryFiltersProps {
  onFilter: (filters: DeliveryFilterValues) => void;
  onClear: () => void;
  initialFilters?: Partial<DeliveryFilterValues>;
}

export function DeliveryFilters({ onFilter, onClear, initialFilters = {} }: DeliveryFiltersProps) {
  const t = useTranslations('merchant.deliveries.filters');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(
    Object.values(initialFilters).filter(Boolean).length
  );

  // Initialize form with provided values
  const form = useForm<DeliveryFilterValues>({
    resolver: zodResolver(deliveryFilterSchema),
    defaultValues: {
      status: initialFilters.status || '',
      searchTerm: initialFilters.searchTerm || '',
      startDate: initialFilters.startDate ? new Date(initialFilters.startDate) : undefined,
      endDate: initialFilters.endDate ? new Date(initialFilters.endDate) : undefined,
    },
  });
  
  const handleSubmit = (values: DeliveryFilterValues) => {
    // Count active filters
    const filtersCount = Object.values(values).filter(Boolean).length;
    setActiveFiltersCount(filtersCount);
    
    // Close filter panel
    setFiltersVisible(false);
    
    // Pass filters to parent
    onFilter(values);
  };
  
  const handleClear = () => {
    form.reset({
      status: '',
      searchTerm: '',
      startDate: undefined,
      endDate: undefined,
    });
    setActiveFiltersCount(0);
    onClear();
  };

  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            className="pl-9"
            value={form.watch('searchTerm')}
            onChange={(e) => {
              form.setValue('searchTerm', e.target.value);
              handleSubmit(form.getValues());
            }}
          />
        </div>
        
        <Button 
          variant={activeFiltersCount > 0 ? "default" : "outline"} 
          onClick={toggleFilters}
          className="flex gap-2"
        >
          <Filter className="h-4 w-4" />
          {t('filterButton')}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {filtersVisible && (
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fields.status')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('fields.allStatuses')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">{t('fields.allStatuses')}</SelectItem>
                            <SelectItem value={DeliveryStatus.PENDING}>{t('statuses.pending')}</SelectItem>
                            <SelectItem value={DeliveryStatus.ASSIGNED}>{t('statuses.assigned')}</SelectItem>
                            <SelectItem value={DeliveryStatus.IN_PROGRESS}>{t('statuses.inProgress')}</SelectItem>
                            <SelectItem value={DeliveryStatus.DELIVERED}>{t('statuses.delivered')}</SelectItem>
                            <SelectItem value={DeliveryStatus.COMPLETED}>{t('statuses.completed')}</SelectItem>
                            <SelectItem value={DeliveryStatus.CANCELLED}>{t('statuses.cancelled')}</SelectItem>
                            <SelectItem value={DeliveryStatus.PROBLEM}>{t('statuses.problem')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('fields.startDate')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: fr })
                                ) : (
                                  <span>{t('fields.pickDate')}</span>
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
                              disabled={(date) =>
                                date > new Date() || (form.getValues('endDate') 
                                  ? date > form.getValues('endDate') 
                                  : false)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {field.value && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-8 h-7 w-7 p-0"
                            onClick={() => form.setValue('startDate', undefined)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">{t('clear')}</span>
                          </Button>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('fields.endDate')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: fr })
                                ) : (
                                  <span>{t('fields.pickDate')}</span>
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
                              disabled={(date) =>
                                date > new Date() || (form.getValues('startDate') 
                                  ? date < form.getValues('startDate') 
                                  : false)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {field.value && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-8 h-7 w-7 p-0"
                            onClick={() => form.setValue('endDate', undefined)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">{t('clear')}</span>
                          </Button>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={handleClear}>
                    {t('clearFilters')}
                  </Button>
                  <Button type="submit">
                    {t('applyFilters')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
