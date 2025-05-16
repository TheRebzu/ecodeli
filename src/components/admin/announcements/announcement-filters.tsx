'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar as CalendarIcon, X, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AnnouncementStatus, AnnouncementType } from '@prisma/client';
import { cn } from '@/lib/utils';

interface FiltersState {
  status: string;
  type: string;
  searchTerm: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
}

interface AnnouncementFiltersProps {
  filters: FiltersState;
  onFilterChange: (filters: Partial<FiltersState>) => void;
}

export function AnnouncementFilters({ filters, onFilterChange }: AnnouncementFiltersProps) {
  const t = useTranslations('admin.announcements');
  const [searchInputValue, setSearchInputValue] = useState(filters.searchTerm);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined
  );

  const handleFilterChange = (name: keyof FiltersState, value: string | number) => {
    onFilterChange({ [name]: value });
  };

  const handleSearch = () => {
    onFilterChange({ searchTerm: searchInputValue });
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    if (date) {
      onFilterChange({ startDate: date.toISOString() });
    } else {
      onFilterChange({ startDate: '' });
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    if (date) {
      onFilterChange({ endDate: date.toISOString() });
    } else {
      onFilterChange({ endDate: '' });
    }
  };

  const resetFilters = () => {
    setSearchInputValue('');
    setFromDate(undefined);
    setToDate(undefined);
    onFilterChange({
      status: '',
      type: '',
      searchTerm: '',
      startDate: '',
      endDate: '',
      page: 1,
    });
  };

  const hasActiveFilters =
    filters.searchTerm || filters.status || filters.type || filters.startDate || filters.endDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-8"
            value={searchInputValue}
            onChange={e => setSearchInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          {searchInputValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-9 w-9 p-0"
              onClick={() => {
                setSearchInputValue('');
                handleFilterChange('searchTerm', '');
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>
        <Button onClick={handleSearch} className="shrink-0">
          {t('search')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="shrink-0"
        >
          <Filter className="mr-2 h-4 w-4" />
          {t('advancedFilters')}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" className="shrink-0" onClick={resetFilters}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('resetFilters')}
          </Button>
        )}
      </div>

      {isAdvancedOpen && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.status')}</label>
            <Select
              value={filters.status}
              onValueChange={value => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="DRAFT">{t('status.draft')}</SelectItem>
                <SelectItem value="PUBLISHED">{t('status.published')}</SelectItem>
                <SelectItem value="IN_APPLICATION">{t('status.inApplication')}</SelectItem>
                <SelectItem value="ASSIGNED">{t('status.assigned')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('status.inProgress')}</SelectItem>
                <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
                <SelectItem value="COMPLETED">{t('status.completed')}</SelectItem>
                <SelectItem value="PAID">{t('status.paid')}</SelectItem>
                <SelectItem value="PROBLEM">{t('status.problem')}</SelectItem>
                <SelectItem value="DISPUTE">{t('status.dispute')}</SelectItem>
                <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.type')}</label>
            <Select value={filters.type} onValueChange={value => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('filters.allTypes')}</SelectItem>
                <SelectItem value="PACKAGE_DELIVERY">{t('type.packageDelivery')}</SelectItem>
                <SelectItem value="GROCERY_SHOPPING">{t('type.groceryShopping')}</SelectItem>
                <SelectItem value="PERSON_TRANSPORT">{t('type.personTransport')}</SelectItem>
                <SelectItem value="AIRPORT_TRANSFER">{t('type.airportTransfer')}</SelectItem>
                <SelectItem value="FOREIGN_PURCHASE">{t('type.foreignPurchase')}</SelectItem>
                <SelectItem value="PET_CARE">{t('type.petCare')}</SelectItem>
                <SelectItem value="HOME_SERVICES">{t('type.homeServices')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.fromDate')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !fromDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? (
                    format(fromDate, 'PPP', { locale: fr })
                  ) : (
                    <span>{t('filters.pickDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.toDate')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !toDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? (
                    format(toDate, 'PPP', { locale: fr })
                  ) : (
                    <span>{t('filters.pickDate')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}
