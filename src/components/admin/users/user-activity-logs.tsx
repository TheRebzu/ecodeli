import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Filter, X, Activity, Search, RefreshCw, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { ActivityType, UserActivityLogItem } from '@/types/admin/admin';

// Activity type to label mapping
const activityTypeLabels: Record<ActivityType, { label: string; color: string }> = {
  [ActivityType.LOGIN]: { label: 'Login', color: 'bg-green-500' },
  [ActivityType.LOGOUT]: { label: 'Logout', color: 'bg-blue-500' },
  [ActivityType.PROFILE_UPDATE]: { label: 'Profile Update', color: 'bg-orange-500' },
  [ActivityType.PASSWORD_CHANGE]: { label: 'Password Change', color: 'bg-amber-500' },
  [ActivityType.STATUS_CHANGE]: { label: 'Status Change', color: 'bg-purple-500' },
  [ActivityType.ROLE_CHANGE]: { label: 'Role Change', color: 'bg-indigo-500' },
  [ActivityType.VERIFICATION_SUBMIT]: { label: 'Verification Submitted', color: 'bg-lime-500' },
  [ActivityType.VERIFICATION_REVIEW]: { label: 'Verification Review', color: 'bg-cyan-500' },
  [ActivityType.DOCUMENT_UPLOAD]: { label: 'Document Upload', color: 'bg-emerald-500' },
  [ActivityType.ACCOUNT_CREATION]: { label: 'Account Creation', color: 'bg-sky-500' },
  [ActivityType.OTHER]: { label: 'Other', color: 'bg-gray-500' },
};

interface UserActivityLogsProps {
  userId: string;
  logs: UserActivityLogItem[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    types?: ActivityType[];
    searchTerm?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function UserActivityLogs({
  logs,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onFilterChange,
  onRefresh,
  onExport,
}: UserActivityLogsProps) {
  const [activeFilters, setActiveFilters] = useState<{
    types?: ActivityType[];
    searchTerm?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }>({});

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...activeFilters, ...newFilters };
    setActiveFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilter = (filterKey: string) => {
    const newFilters = { ...activeFilters };
    // @ts-ignore
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>User activity history and audit trail</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-8 w-[250px]"
              value={activeFilters.searchTerm || ''}
              onChange={e => handleFilterChange({ searchTerm: e.target.value })}
            />
          </div>

          <Select
            value={activeFilters.types ? 'selected' : ''}
            onValueChange={value => {
              if (value === '') {
                clearFilter('types');
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Activities</SelectItem>
              <SelectItem value="selected">Selected Types</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <div className="space-y-2">
                <h4 className="font-medium">Filter by date</h4>
                <div className="grid gap-2">
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <label htmlFor="from">From</label>
                      <DatePicker
                        value={activeFilters.dateFrom}
                        onChange={date => handleFilterChange({ dateFrom: date })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <label htmlFor="to">To</label>
                      <DatePicker
                        value={activeFilters.dateTo}
                        onChange={date => handleFilterChange({ dateTo: date })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearFilter('dateFrom');
                      clearFilter('dateTo');
                    }}
                  >
                    Clear dates
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active filters display */}
          {Object.keys(activeFilters).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {activeFilters.types && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Activity Types ({activeFilters.types.length})
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => clearFilter('types')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {activeFilters.searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {activeFilters.searchTerm}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => clearFilter('searchTerm')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {(activeFilters.dateFrom || activeFilters.dateTo) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date Range
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => {
                      clearFilter('dateFrom');
                      clearFilter('dateTo');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {Object.keys(activeFilters).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setActiveFilters({});
                    onFilterChange({});
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Activity Log Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No activity logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          className={activityTypeLabels[log.activityType]?.color || 'bg-gray-500'}
                        >
                          {activityTypeLabels[log.activityType]?.label || log.activityType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.createdAt), 'MMM d, yyyy')}
                          <span className="mx-1 text-muted-foreground">·</span>
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.details || (
                          <span className="text-muted-foreground italic">No details</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.ipAddress || <span className="text-muted-foreground italic">N/A</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Showing <span className="font-medium">{logs.length}</span> of{' '}
                  <span className="font-medium">{total}</span> logs
                </div>
                <div className="space-x-2">
                  <Pagination
                    totalItems={total}
                    itemsPerPage={limit}
                    currentPage={page}
                    onPageChange={onPageChange}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
