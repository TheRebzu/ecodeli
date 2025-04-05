"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  User, 
  UserService, 
  UserCreateDTO, 
  UserUpdateDTO,
  UserFilter
} from "@/lib/services/user.service";
import { useData } from "./use-data";

export function useUsers() {
  const userService = new UserService();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<User[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Use the generic data hook for basic CRUD operations
  const {
    data: users,
    currentItem: selectedUser,
    loading,
    error,
    pagination,
    meta,
    fetchData,
    fetchById,
    create,
    update,
    remove,
    bulkCreate,
    bulkUpdate,
    bulkDelete,
    refresh,
    changePage,
    changePageSize,
    setCurrentItem: setSelectedUser,
  } = useData<User, UserCreateDTO, UserUpdateDTO>("/users", {
    useCache: true,
    revalidateOnFocus: true,
  });

  // Get the current logged-in user
  const getCurrentUser = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await userService.getCurrentUser();
      if (response.success && response.data) {
        setCurrentUser(response.data);
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error fetching current user:", error);
      toast.error("Impossible de récupérer l'utilisateur actuel");
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [userService]);

  // Update the current user profile
  const updateProfile = useCallback(async (data: Partial<UserUpdateDTO>) => {
    setProfileLoading(true);
    try {
      const response = await userService.updateProfile(data);
      if (response.success && response.data) {
        setCurrentUser(response.data);
        toast.success("Profil mis à jour avec succès");
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Impossible de mettre à jour le profil");
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [userService]);

  // Change user password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setProfileLoading(true);
    try {
      const response = await userService.changePassword(currentPassword, newPassword);
      if (response.success) {
        toast.success("Mot de passe modifié avec succès");
        return true;
      } else if (response.message) {
        toast.error(response.message);
      }
      return false;
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Impossible de modifier le mot de passe");
      return false;
    } finally {
      setProfileLoading(false);
    }
  }, [userService]);

  // Upload user avatar
  const uploadAvatar = useCallback(async (file: File) => {
    setProfileLoading(true);
    try {
      const response = await userService.uploadAvatar(file);
      if (response.success && response.data) {
        toast.success("Avatar téléchargé avec succès");
        
        // Update current user with new avatar
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            avatarUrl: response.data.avatarUrl,
          });
        }
        
        return response.data.avatarUrl;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Impossible de télécharger l'avatar");
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser, userService]);

  // Change user status
  const changeStatus = useCallback(async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    try {
      const response = await userService.changeStatus(id, status);
      if (response.success && response.data) {
        toast.success(`Statut de l'utilisateur modifié avec succès`);
        
        // Update selected user if needed
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser({
            ...selectedUser,
            status,
          });
        }
        
        // Refresh users list
        refresh();
        
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return null;
    } catch (error) {
      console.error("Error changing user status:", error);
      toast.error("Impossible de modifier le statut de l'utilisateur");
      return null;
    }
  }, [refresh, selectedUser, setSelectedUser, userService]);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }
    
    setSearchLoading(true);
    
    try {
      const response = await userService.searchUsers(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      setSearchResults([]);
      return [];
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Impossible de rechercher les utilisateurs");
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [userService]);

  // Get users by role
  const getUsersByRole = useCallback(async (role: string) => {
    try {
      const response = await userService.getUsersByRole(role);
      if (response.success && response.data) {
        return response.data;
      } else if (response.message) {
        toast.error(response.message);
      }
      return [];
    } catch (error) {
      console.error("Error fetching users by role:", error);
      toast.error("Impossible de récupérer les utilisateurs par rôle");
      return [];
    }
  }, [userService]);

  return {
    // Generic data operations
    users,
    selectedUser,
    loading,
    error,
    pagination,
    meta,
    fetchUsers: fetchData,
    getUserById: fetchById,
    createUser: create,
    updateUser: update,
    deleteUser: remove,
    bulkCreateUsers: bulkCreate,
    bulkUpdateUsers: bulkUpdate,
    bulkDeleteUsers: bulkDelete,
    refreshUsers: refresh,
    changePage,
    changePageSize,
    setSelectedUser,
    
    // Custom user operations
    currentUser,
    searchResults,
    searchLoading,
    profileLoading,
    getCurrentUser,
    updateProfile,
    changePassword,
    uploadAvatar,
    changeStatus,
    searchUsers,
    getUsersByRole,
  };
} 