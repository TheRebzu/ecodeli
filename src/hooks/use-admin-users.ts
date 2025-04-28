import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserRole, UserStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { UserFilters, UserSortOptions, ActivityType } from '@/types/admin/admin';

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
      onError: error => {
        toast.error(`Error loading users: ${error.message}`);
      },
    }
  );

  // Query for user statistics
  const { data: userStats, isLoading: isLoadingStats } = api.adminUser.getUserStats.useQuery(
    undefined,
    {
      onError: error => {
        toast.error(`Error loading user statistics: ${error.message}`);
      },
    }
  );

  // Query to fetch a specific user
  const getUserDetail = (userId: string, options = { includeActivityLogs: false }) => {
    return api.adminUser.getUserDetail.useQuery(
      { userId, ...options },
      {
        enabled: !!userId,
        onError: error => {
          toast.error(`Error loading user details: ${error.message}`);
        },
      }
    );
  };

  // Query to fetch user activity logs
  const getUserActivityLogs = (userId: string, options = {}) => {
    return api.adminUser.getUserActivityLogs.useQuery(
      { userId, ...options },
      {
        enabled: !!userId,
        onError: error => {
          toast.error(`Error loading activity logs: ${error.message}`);
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
    onError: error => {
      toast.error(`Error updating user status: ${error.message}`);
    },
  });

  // Mutation to update user role
  const updateUserRoleMutation = api.adminUser.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success('User role updated successfully');
      refetchUsers();
    },
    onError: error => {
      toast.error(`Error updating user role: ${error.message}`);
    },
  });

  // Mutation to update admin permissions
  const updateAdminPermissionsMutation = api.adminUser.updateAdminPermissions.useMutation({
    onSuccess: () => {
      toast.success('Admin permissions updated successfully');
      refetchUsers();
    },
    onError: error => {
      toast.error(`Error updating admin permissions: ${error.message}`);
    },
  });

  // Mutation to add a note to a user
  const addUserNoteMutation = api.adminUser.addUserNote.useMutation({
    onSuccess: () => {
      toast.success('Note added successfully');
    },
    onError: error => {
      toast.error(`Error adding note: ${error.message}`);
    },
  });

  // Mutation to add activity log
  const addActivityLogMutation = api.adminUser.addUserActivityLog.useMutation({
    onSuccess: () => {
      toast.success('Activity log added successfully');
    },
    onError: error => {
      toast.error(`Error adding activity log: ${error.message}`);
    },
  });

  // Mutation to export users
  const exportUsersMutation = api.adminUser.exportUsers.useMutation({
    onSuccess: data => {
      // Create download link for exported data
      const blob = new Blob([data.data], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Users exported successfully');
    },
    onError: error => {
      toast.error(`Error exporting users: ${error.message}`);
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
  const updateUserStatus = (
    userId: string,
    status: UserStatus,
    reason?: string,
    notifyUser = true
  ) => {
    updateUserStatusMutation.mutate({ userId, status, reason, notifyUser });
  };

  // Function to update user role
  const updateUserRole = (
    userId: string,
    role: UserRole,
    reason?: string,
    createRoleSpecificProfile = true
  ) => {
    updateUserRoleMutation.mutate({ userId, role, reason, createRoleSpecificProfile });
  };

  // Function to update admin permissions
  const updateAdminPermissions = (userId: string, permissions: string[]) => {
    updateAdminPermissionsMutation.mutate({ userId, permissions });
  };

  // Function to add a note to a user
  const addUserNote = (userId: string, note: string) => {
    addUserNoteMutation.mutate({ userId, note });
  };

  // Function to add activity log
  const addActivityLog = (userId: string, activityType: ActivityType, details?: string) => {
    addActivityLogMutation.mutate({ userId, activityType, details });
  };

  // Function to export users
  const exportUsers = (
    format: 'csv' | 'excel' | 'pdf',
    fields: string[],
    exportFilters?: UserFilters
  ) => {
    exportUsersMutation.mutate({
      format,
      fields,
      filters: exportFilters || filters,
    });
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
    userStats,
    isLoadingUsers,
    isLoadingStats,
    isUpdatingStatus: updateUserStatusMutation.isLoading,
    isUpdatingRole: updateUserRoleMutation.isLoading,
    isUpdatingPermissions: updateAdminPermissionsMutation.isLoading,
    isAddingNote: addUserNoteMutation.isLoading,
    isAddingActivityLog: addActivityLogMutation.isLoading,
    isExportingUsers: exportUsersMutation.isLoading,

    // Actions
    handlePageChange,
    handleLimitChange,
    handleFilterChange,
    handleSortChange,
    updateUserStatus,
    updateUserRole,
    updateAdminPermissions,
    addUserNote,
    addActivityLog,
    exportUsers,
    viewUserDetail,
    getUserDetail,
    getUserActivityLogs,
    refetchUsers,
  };
}
