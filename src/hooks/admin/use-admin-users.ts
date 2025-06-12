import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserRole, UserStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import {
  UserFilters,
  UserSortOptions,
  ActivityType,
  UserActionType,
  NoteCategory,
  NoteVisibility,
} from '@/types/actors/admin';

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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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
        toast.error(`Erreur de chargement des utilisateurs: ${error.message}`);
      },
    }
  );

  // Query for user statistics
  const { data: userStats, isLoading: isLoadingStats } = api.adminUser.getUserStats.useQuery(
    undefined,
    {
      onError: error => {
        toast.error(`Erreur de chargement des statistiques: ${error.message}`);
      },
    }
  );

  // Query to fetch a specific user - TEMPORAIRE: Désactivé pour éviter les erreurs d'auth
  const getUserDetail = (
    userId: string,
    options = {
      includeActivityLogs: false,
      includeLoginHistory: false,
      includeNotes: false,
    }
  ) => {
    // TODO: Remettre l'API réelle quand l'authentification admin sera configurée
    // return api.adminUser.getUserDetail.useQuery(
    //   { userId, ...options },
    //   {
    //     enabled: !!userId,
    //     onError: error => {
    //       toast.error(`Erreur de chargement des détails utilisateur: ${error.message}`);
    //     },
    //   }
    // );

    // Retour fictif pour éviter les erreurs
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  };

  // Query to fetch user activity logs
  const getUserActivityLogs = (userId: string, options = {}) => {
    return api.adminUser.getUserActivityLogs.useQuery(
      { userId, ...options },
      {
        enabled: !!userId,
        onError: error => {
          toast.error(`Erreur de chargement des logs d'activité: ${error.message}`);
        },
      }
    );
  };

  // Mutation to update user status
  const updateUserStatusMutation = api.adminUser.updateUserStatus.useMutation({
    onSuccess: () => {
      toast.success('Statut utilisateur mis à jour avec succès');
      refetchUsers();
    },
    onError: error => {
      toast.error(`Erreur de mise à jour du statut: ${error.message}`);
    },
  });

  // Mutation to update user role
  const updateUserRoleMutation = api.adminUser.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success('Rôle utilisateur mis à jour avec succès');
      refetchUsers();
    },
    onError: error => {
      toast.error(`Erreur de mise à jour du rôle: ${error.message}`);
    },
  });

  // Mutation to update admin permissions
  const updateAdminPermissionsMutation = api.adminUser.updateAdminPermissions.useMutation({
    onSuccess: () => {
      toast.success('Permissions administrateur mises à jour avec succès');
      refetchUsers();
    },
    onError: error => {
      toast.error(`Erreur de mise à jour des permissions: ${error.message}`);
    },
  });

  // Mutation to add a note to a user
  const addUserNoteMutation = api.adminUser.addUserNote.useMutation({
    onSuccess: () => {
      toast.success('Note ajoutée avec succès');
    },
    onError: error => {
      toast.error(`Erreur d'ajout de note: ${error.message}`);
    },
  });

  // Mutation to add activity log
  const addActivityLogMutation = api.adminUser.addUserActivityLog.useMutation({
    onSuccess: () => {
      toast.success("Journal d'activité ajouté avec succès");
    },
    onError: error => {
      toast.error(`Erreur d'ajout de journal d'activité: ${error.message}`);
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

      toast.success('Utilisateurs exportés avec succès');
    },
    onError: error => {
      toast.error(`Erreur d'exportation: ${error.message}`);
    },
  });

  // Mutation for force password reset
  const forcePasswordResetMutation = api.adminUser.forcePasswordReset.useMutation({
    onSuccess: () => {
      toast.success('Réinitialisation du mot de passe initiée avec succès');
      refetchUsers();
    },
    onError: error => {
      toast.error(`Erreur de réinitialisation du mot de passe: ${error.message}`);
    },
  });

  // Mutation for bulk user actions
  const bulkUserActionMutation = api.adminUser.bulkUserAction.useMutation({
    onSuccess: data => {
      toast.success(`Action en masse effectuée sur ${data.processed} utilisateurs`);
      setSelectedUsers([]); // Clear selections after action
      refetchUsers();
    },
    onError: error => {
      toast.error(`Erreur lors de l'action en masse: ${error.message}`);
    },
  });

  // Mutation for permanently deleting a user
  const permanentlyDeleteUserMutation = api.adminUser.permanentlyDeleteUser.useMutation({
    onSuccess: () => {
      toast.success('Utilisateur définitivement supprimé');
      router.push('/admin/users');
    },
    onError: error => {
      toast.error(`Erreur de suppression: ${error.message}`);
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
    notifyUser = true,
    expiresAt?: Date
  ) => {
    updateUserStatusMutation.mutate({ userId, status, reason, notifyUser, expiresAt });
  };

  // Function to update user role
  const updateUserRole = (
    userId: string,
    role: UserRole,
    reason?: string,
    createRoleSpecificProfile = true,
    transferExistingData = false
  ) => {
    updateUserRoleMutation.mutate({
      userId,
      role,
      reason,
      createRoleSpecificProfile,
      transferExistingData,
    });
  };

  // Function to update admin permissions
  const updateAdminPermissions = (userId: string, permissions: string[], expiresAt?: Date) => {
    updateAdminPermissionsMutation.mutate({ userId, permissions, expiresAt });
  };

  // Function to add a note to a user
  const addUserNote = (
    userId: string,
    note: string,
    category: NoteCategory = NoteCategory.GENERAL,
    visibility: NoteVisibility = NoteVisibility.ADMIN_ONLY
  ) => {
    addUserNoteMutation.mutate({ userId, note, category, visibility });
  };

  // Function to add activity log
  const addActivityLog = (
    userId: string,
    activityType: ActivityType,
    details?: string,
    importance: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ) => {
    addActivityLogMutation.mutate({ userId, activityType, details, importance });
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

  // Function to force password reset
  const forcePasswordReset = (
    userId: string,
    options: {
      reason?: string;
      notifyUser?: boolean;
      expireExistingTokens?: boolean;
    } = {}
  ) => {
    forcePasswordResetMutation.mutate({
      userId,
      ...options,
    });
  };

  // Function to execute bulk action on selected users
  const executeBulkAction = (
    action: UserActionType,
    options: {
      reason?: string;
      notifyUsers?: boolean;
      additionalData?: Record<string, any>;
    } = {}
  ) => {
    if (selectedUsers.length === 0) {
      toast.error('Aucun utilisateur sélectionné pour cette action.');
      return;
    }

    bulkUserActionMutation.mutate({
      userIds: selectedUsers,
      action,
      ...options,
    });
  };

  // Function to permanently delete a user (with admin password confirmation)
  const permanentlyDeleteUser = (userId: string, adminPassword: string, reason: string) => {
    permanentlyDeleteUserMutation.mutate({
      userId,
      adminPassword,
      reason,
    });
  };

  // Function to handle user selection for bulk actions
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Function to select/deselect all users on current page
  const toggleSelectAllUsers = (selectAll: boolean) => {
    if (!usersData?.users) return;

    if (selectAll) {
      const currentPageUserIds = usersData.users.map(user => user.id);
      setSelectedUsers(prev => {
        // Add only new IDs, avoid duplicates
        const newIds = currentPageUserIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    } else {
      // Only remove users from current page
      const currentPageUserIds = usersData.users.map(user => user.id);
      setSelectedUsers(prev => prev.filter(id => !currentPageUserIds.includes(id)));
    }
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
    selectedUsers,
    isLoadingUsers,
    isLoadingStats,

    // Loading states
    isUpdatingStatus: updateUserStatusMutation.isLoading,
    isUpdatingRole: updateUserRoleMutation.isLoading,
    isUpdatingPermissions: updateAdminPermissionsMutation.isLoading,
    isAddingNote: addUserNoteMutation.isLoading,
    isAddingActivityLog: addActivityLogMutation.isLoading,
    isExportingUsers: exportUsersMutation.isLoading,
    isResettingPassword: forcePasswordResetMutation.isLoading,
    isExecutingBulkAction: bulkUserActionMutation.isLoading,
    isDeletingUser: permanentlyDeleteUserMutation.isLoading,

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
    refetchUsers,
    forcePasswordReset,
    executeBulkAction,
    permanentlyDeleteUser,
    toggleUserSelection,
    toggleSelectAllUsers,

    // Helpers
    getUserDetail,
    getUserActivityLogs,
  };
}
