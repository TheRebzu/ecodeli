import { useState } from 'react';
import { UserRole, UserStatus } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserFilters } from '@/types/admin';

const filterSchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isVerified: z.boolean().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

interface UserFiltersProps {
  currentFilters: UserFilters;
  onFilterChange: (filters: UserFilters) => void;
  onResetFilters: () => void;
}

export function UserFiltersForm({
  currentFilters,
  onFilterChange,
  onResetFilters,
}: UserFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: currentFilters.search || '',
      role: currentFilters.role,
      status: currentFilters.status,
      isVerified: currentFilters.isVerified,
      dateFrom: currentFilters.dateFrom,
      dateTo: currentFilters.dateTo,
    },
  });

  const hasActiveFilters =
    !!currentFilters.search ||
    !!currentFilters.role ||
    !!currentFilters.status ||
    currentFilters.isVerified !== undefined ||
    !!currentFilters.dateFrom ||
    !!currentFilters.dateTo;

  const onSubmit = (values: z.infer<typeof filterSchema>) => {
    const newActiveFilters: string[] = [];

    if (values.search) newActiveFilters.push('search');
    if (values.role) newActiveFilters.push('role');
    if (values.status) newActiveFilters.push('status');
    if (values.isVerified !== undefined) newActiveFilters.push('verification');
    if (values.dateFrom || values.dateTo) newActiveFilters.push('date');

    setActiveFilters(newActiveFilters);
    onFilterChange(values);
  };

  const handleClearFilter = (filter: keyof UserFilters) => {
    form.setValue(filter, undefined);
    setActiveFilters(activeFilters.filter(f => f !== filter));

    const newFilters = { ...currentFilters };
    delete newFilters[filter];

    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap gap-3">
          {/* Search Field */}
          <FormField
            control={form.control}
            name="search"
            render={({ field }) => (
              <FormItem className="flex-1 min-w-[240px]">
                <FormControl>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or email"
                      className="pl-8"
                      {...field}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          {/* Role Filter */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="w-[180px]">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={undefined}>All Roles</SelectItem>
                    {Object.values(UserRole).map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Status Filter */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="w-[180px]">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={undefined}>All Statuses</SelectItem>
                    {Object.values(UserStatus).map(status => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Verification Filter */}
          <FormField
            control={form.control}
            name="isVerified"
            render={({ field }) => (
              <FormItem className="w-[180px]">
                <Select
                  onValueChange={value => {
                    if (value === '') {
                      field.onChange(undefined);
                    } else {
                      field.onChange(value === 'true');
                    }
                  }}
                  value={field.value === undefined ? '' : field.value.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Date Range Filter */}
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="dateFrom"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-[130px] pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : 'From date'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date =>
                          date > new Date() ||
                          (form.getValues().dateTo ? date > form.getValues().dateTo : false)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateTo"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-[130px] pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : 'To date'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date =>
                          date > new Date() ||
                          (form.getValues().dateFrom ? date < form.getValues().dateFrom : false)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Apply Filters</Button>
            {hasActiveFilters && (
              <Button type="button" variant="outline" onClick={onResetFilters}>
                Reset
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="text-sm text-muted-foreground py-1">Active filters:</div>

          {currentFilters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {currentFilters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleClearFilter('search')} />
            </Badge>
          )}

          {currentFilters.role && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Role: {currentFilters.role}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleClearFilter('role')} />
            </Badge>
          )}

          {currentFilters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {currentFilters.status.replace('_', ' ')}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleClearFilter('status')} />
            </Badge>
          )}

          {currentFilters.isVerified !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {currentFilters.isVerified ? 'Verified' : 'Unverified'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleClearFilter('isVerified')}
              />
            </Badge>
          )}

          {(currentFilters.dateFrom || currentFilters.dateTo) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date:{' '}
              {currentFilters.dateFrom
                ? format(new Date(currentFilters.dateFrom), 'MMM d, yyyy')
                : 'Any'}
              {' to '}
              {currentFilters.dateTo
                ? format(new Date(currentFilters.dateTo), 'MMM d, yyyy')
                : 'Any'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  handleClearFilter('dateFrom');
                  handleClearFilter('dateTo');
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
