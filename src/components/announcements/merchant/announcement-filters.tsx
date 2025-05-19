'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Search, X, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FiltersState {
  status: string;
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
  const t = useTranslations('merchant.announcements');
  const [searchValue, setSearchValue] = useState(filters.searchTerm);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onFilterChange({ searchTerm: searchValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchValue('');
    onFilterChange({ searchTerm: '' });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ status: value });
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    if (date) {
      onFilterChange({ startDate: format(date, 'yyyy-MM-dd') });
    } else {
      onFilterChange({ startDate: '' });
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    if (date) {
      onFilterChange({ endDate: format(date, 'yyyy-MM-dd') });
    } else {
      onFilterChange({ endDate: '' });
    }
  };

  const resetFilters = () => {
    setSearchValue('');
    setFromDate(undefined);
    setToDate(undefined);
    onFilterChange({
      searchTerm: '',
      status: '',
      startDate: '',
      endDate: '',
      page: 1,
    });
  };

  const hasActiveFilters =
    filters.searchTerm || filters.status || filters.startDate || filters.endDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-8"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t('filters.clear')}</span>
            </Button>
          )}
        </div>

        <Button onClick={handleSearch}>{t('filters.search')}</Button>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {t('filters.advanced')}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={resetFilters} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('filters.reset')}
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('filters.status')}</label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="DRAFT">{t('status.draft')}</SelectItem>
                <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
                <SelectItem value="INACTIVE">{t('status.inactive')}</SelectItem>
                <SelectItem value="EXPIRED">{t('status.expired')}</SelectItem>
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
                    <span>{t('filters.selectDate')}</span>
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
                    <span>{t('filters.selectDate')}</span>
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
