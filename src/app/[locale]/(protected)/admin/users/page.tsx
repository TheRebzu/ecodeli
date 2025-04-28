'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserRole, UserStatus } from '@prisma/client';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { UserTable } from '@/components/admin/users/user-table';
import { UserFiltersForm } from '@/components/admin/users/user-filters';
import { UserFilters } from '@/types/admin/admin';

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<string>('all');

  const {
    users,
    totalUsers,
    isLoadingUsers,
    filters,
    handlePageChange,
    handleFilterChange,
    updateUserStatus,
    updateUserRole,
    viewUserDetail,
  } = useAdminUsers();

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    let newFilters: UserFilters = {};

    switch (value) {
      case 'clients':
        newFilters = { role: UserRole.CLIENT };
        break;
      case 'deliverers':
        newFilters = { role: UserRole.DELIVERER };
        break;
      case 'merchants':
        newFilters = { role: UserRole.MERCHANT };
        break;
      case 'providers':
        newFilters = { role: UserRole.PROVIDER };
        break;
      case 'admins':
        newFilters = { role: UserRole.ADMIN };
        break;
      case 'pending':
        newFilters = { status: UserStatus.PENDING_VERIFICATION };
        break;
      case 'suspended':
        newFilters = { status: UserStatus.SUSPENDED };
        break;
      case 'all':
      default:
        // No filters for "all" tab
        break;
    }

    handleFilterChange(newFilters);
  };

  const handleResetFilters = () => {
    setActiveTab('all');
    handleFilterChange({});
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users, verify accounts, and update permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/create">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {isLoadingUsers ? 'Loading users...' : `${totalUsers} users in total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="deliverers">Deliverers</TabsTrigger>
              <TabsTrigger value="merchants">Merchants</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="admins">Admins</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* Filters */}
              <UserFiltersForm
                currentFilters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
              />

              {/* User Table */}
              {isLoadingUsers ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  <UserTable
                    users={users}
                    onViewUser={viewUserDetail}
                    onUpdateStatus={updateUserStatus}
                    onUpdateRole={updateUserRole}
                  />

                  {/* Pagination */}
                  {totalUsers > 0 && (
                    <div className="flex items-center justify-end space-x-2 py-4">
                      <div className="flex-1 text-sm text-muted-foreground">
                        Showing <span className="font-medium">{users.length}</span> of{' '}
                        <span className="font-medium">{totalUsers}</span> users
                      </div>
                      <div className="space-x-2">
                        <Pagination
                          totalItems={totalUsers}
                          itemsPerPage={filters.limit || 10}
                          currentPage={filters.page || 1}
                          onPageChange={handlePageChange}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
