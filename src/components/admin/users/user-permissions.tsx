"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Shield,
  User,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  AlertTriangle,
  Users,
  Lock,
  Unlock,
} from "lucide-react";

import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Schéma de validation pour les permissions
const permissionSchema = z.object({
  userId: z.string().min(1, "L'utilisateur est requis"),
  permissions: z.array(z.string()).min(1, "Au moins une permission est requise"),
  expiresAt: z.string().optional(),
});

interface UserPermission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  permissions: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    isGranted: boolean;
    grantedAt?: Date;
    grantedBy?: string;
    expiresAt?: Date;
  }>;
  lastUpdated: Date;
  updatedBy: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemPermission: boolean;
}

interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export default function UserPermissions() {
  const t = useTranslations("admin.permissions");
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<UserPermission | null>(null);

  // Récupérer les utilisateurs
  const { data: users, isLoading: isLoadingUsers } = api.admin.getUsers.useQuery();

  // Récupérer les permissions disponibles
  const { data: permissionCategories, isLoading: isLoadingPermissions } = 
    api.admin.getPermissionCategories.useQuery();

  // Récupérer les permissions d'un utilisateur spécifique
  const { data: userPermissions, isLoading: isLoadingUserPermissions, refetch } = 
    api.admin.getUserPermissions.useQuery(
      { userId: selectedUser },
      { enabled: !!selectedUser }
    );

  // Mutations pour gérer les permissions
  const updatePermissionsMutation = api.admin.updateUserPermissions.useMutation({
    onSuccess: () => {
      toast({
        title: t("permissionsUpdated"),
        description: t("permissionsUpdatedDescription"),
      });
      refetch();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const revokePermissionMutation = api.admin.revokeUserPermission.useMutation({
    onSuccess: () => {
      toast({
        title: t("permissionRevoked"),
        description: t("permissionRevokedDescription"),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  // Formulaire pour les permissions
  const form = useForm({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      userId: selectedUser,
      permissions: [],
      expiresAt: "",
    },
  });

  // Gestionnaires d'événements
  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    form.setValue("userId", userId);
  };

  const handleEditPermissions = (userPermission: UserPermission) => {
    setSelectedUserPermissions(userPermission);
    form.setValue("userId", userPermission.userId);
    form.setValue("permissions", userPermission.permissions.filter(p => p.isGranted).map(p => p.id));
    setIsEditDialogOpen(true);
  };

  const handleRevokePermission = (userId: string, permissionId: string) => {
    revokePermissionMutation.mutate({ userId, permissionId });
  };

  const handleSubmitPermissions = (data: any) => {
    updatePermissionsMutation.mutate({
      userId: data.userId,
      permissions: data.permissions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  };

  // Obtenir la couleur du rôle
  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "MERCHANT":
        return "bg-blue-100 text-blue-800";
      case "PROVIDER":
        return "bg-green-100 text-green-800";
      case "DELIVERER":
        return "bg-yellow-100 text-yellow-800";
      case "CLIENT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Obtenir l'icône de permission
  const getPermissionIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "user_management":
        return Users;
      case "content_management":
        return Edit;
      case "system_settings":
        return Settings;
      case "financial":
        return Shield;
      default:
        return Lock;
    }
  };

  if (isLoadingUsers || isLoadingPermissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("title")}
          </div>
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            disabled={!selectedUser}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("editPermissions")}
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sélection d'utilisateur */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">{t("selectUser")}</Label>
              <Select value={selectedUser} onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectUserPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.name}</span>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Liste des utilisateurs avec permissions */}
            {users && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="font-medium">{t("usersWithPermissions")}</h4>
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedUser === user.id ? "bg-muted border-primary" : ""
                    }`}
                    onClick={() => handleUserSelect(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge variant="outline">
                          {user.permissionsCount || 0} {t("permissions")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permissions de l'utilisateur sélectionné */}
          <div className="space-y-4">
            {selectedUser ? (
              <>
                {isLoadingUserPermissions ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : userPermissions ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{t("currentPermissions")}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPermissions(userPermissions)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t("edit")}
                      </Button>
                    </div>

                    {/* Permissions par catégorie */}
                    <div className="space-y-3">
                      {permissionCategories?.map((category) => {
                        const categoryPermissions = userPermissions.permissions.filter(
                          p => p.category === category.id
                        );
                        
                        if (categoryPermissions.length === 0) return null;

                        const PermissionIcon = getPermissionIcon(category.id);
                        
                        return (
                          <div key={category.id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <PermissionIcon className="h-4 w-4 text-muted-foreground" />
                              <h5 className="font-medium text-sm">{category.name}</h5>
                            </div>
                            <div className="space-y-2">
                              {categoryPermissions.map((permission) => (
                                <div
                                  key={permission.id}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    {permission.isGranted ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{permission.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {permission.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {permission.expiresAt && (
                                      <Badge variant="outline" size="sm">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {t("expires")}: {new Date(permission.expiresAt).toLocaleDateString()}
                                      </Badge>
                                    )}
                                    {permission.isGranted && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleRevokePermission(userPermissions.userId, permission.id)}
                                        disabled={revokePermissionMutation.isLoading}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("noPermissions")}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("selectUserToView")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dialog pour éditer les permissions */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t("editUserPermissions")}</DialogTitle>
              <DialogDescription>
                {t("editPermissionsDescription")}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitPermissions)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("selectPermissions")}</FormLabel>
                      <FormControl>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {permissionCategories?.map((category) => {
                            const PermissionIcon = getPermissionIcon(category.id);
                            return (
                              <div key={category.id} className="border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <PermissionIcon className="h-5 w-5 text-primary" />
                                  <h4 className="font-medium">{category.name}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {category.permissions.map((permission) => (
                                    <div key={permission.id} className="flex items-start space-x-3">
                                      <Checkbox
                                        id={permission.id}
                                        checked={field.value?.includes(permission.id)}
                                        onCheckedChange={(checked) => {
                                          const updatedValue = checked
                                            ? [...(field.value || []), permission.id]
                                            : (field.value || []).filter((id) => id !== permission.id);
                                          field.onChange(updatedValue);
                                        }}
                                      />
                                      <div className="grid gap-1.5 leading-none">
                                        <label
                                          htmlFor={permission.id}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {permission.name}
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                          {permission.description}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("expirationDate")} ({t("optional")})</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("expirationDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updatePermissionsMutation.isLoading}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("updatePermissions")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
