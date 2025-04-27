import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserRole, UserStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { UserFilters, UserSortOptions } from '@/types/admin';

export function useAdminUsers() {
  const router = useRouter();
  const [filters, setFilters] = useState<UserFilters & { page: number; limit: number }>({
    page: 1,
    limit: 10,
  });
  const [sortOptions, setSortOptions] = useState<UserSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Query to fetch users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = api.adminUser.getUsers.useQuery(
    {
      ...filters,
      sortBy: sortOptions.field,
      sortDirection: sortOptions.direction,
    },
    {
      keepPreviousData: true,
      onError: (error: Error) => {
        toast.error(`Error loading users: ${error.message}`);
      },
    }
  );

  // Query to fetch a specific user
  const getUserDetail = (userId: string) => {
    return api.adminUser.getUserDetail.useQuery(
      { userId },
      {
        enabled: !!userId,
        onError: (error: Error) => {
          toast.error(`Error loading user details: ${error.message}`);
        },
      }
    );
  };

  // Mutation to update user status
  const updateUserStatusMutation = api.adminUser.updateUserStatus.useMutation({
    onSuccess: () => {
      toast.success('User status updated successfully');
      refetchUsers();
    },
    onError: (error: Error) => {
      toast.error(`Error updating user status: ${error.message}`);
    },
  });

  // Mutation to update user role
  const updateUserRoleMutation = api.adminUser.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success('User role updated successfully');
      refetchUsers();
    },
    onError: (error: Error) => {
      toast.error(`Error updating user role: ${error.message}`);
    },
  });

  // Mutation to update admin permissions
  const updateAdminPermissionsMutation = api.adminUser.updateAdminPermissions.useMutation({
    onSuccess: () => {
      toast.success('Admin permissions updated successfully');
      refetchUsers();
    },
    onError: (error: Error) => {
      toast.error(`Error updating admin permissions: ${error.message}`);
    },
  });

  // Function to handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Function to handle limit change
  const handleLimitChange = (limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  };

  // Function to handle filter change
  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Function to handle sort change
  const handleSortChange = (field: UserSortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Function to update user status
  const updateUserStatus = (userId: string, status: UserStatus) => {
    updateUserStatusMutation.mutate({ userId, status });
  };

  // Function to update user role
  const updateUserRole = (userId: string, role: UserRole) => {
    updateUserRoleMutation.mutate({ userId, role });
  };

  // Function to update admin permissions
  const updateAdminPermissions = (userId: string, permissions: string[]) => {
    updateAdminPermissionsMutation.mutate({ userId, permissions });
  };

  // Function to view user detail
  const viewUserDetail = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return {
    // Data
    users: usersData?.users || [],
    totalUsers: usersData?.total || 0,
    filters,
    sortOptions,
    isLoadingUsers,
    isUpdatingStatus: updateUserStatusMutation.isLoading,
    isUpdatingRole: updateUserRoleMutation.isLoading,
    isUpdatingPermissions: updateAdminPermissionsMutation.isLoading,

    // Actions
    handlePageChange,
    handleLimitChange,
    handleFilterChange,
    handleSortChange,
    updateUserStatus,
    updateUserRole,
    updateAdminPermissions,
    viewUserDetail,
    getUserDetail,
    refetchUsers,
  };
}
