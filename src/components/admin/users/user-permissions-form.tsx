import { useState } from 'react';
import { UserRole } from '@prisma/client';
import { Check, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminPermission } from '@/types/admin/admin';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGroup {
  name: string;
  description: string;
  permissions: {
    key: AdminPermission;
    label: string;
    description: string;
  }[];
}

const permissionGroups: PermissionGroup[] = [
  {
    name: 'User Management',
    description: 'Permissions for managing user accounts and profiles',
    permissions: [
      {
        key: 'users.view',
        label: 'View Users',
        description: 'Can view user profiles and information',
      },
      { key: 'users.create', label: 'Create Users', description: 'Can create new user accounts' },
      {
        key: 'users.edit',
        label: 'Edit Users',
        description: 'Can modify user information and settings',
      },
      { key: 'users.delete', label: 'Delete Users', description: 'Can delete user accounts' },
      {
        key: 'users.manage',
        label: 'Manage All Users',
        description: 'Full control of all user operations (includes all user permissions above)',
      },
    ],
  },
  {
    name: 'Verification',
    description: 'Permissions related to user verification procedures',
    permissions: [
      {
        key: 'verifications.view',
        label: 'View Verifications',
        description: 'Can view verification requests and documents',
      },
      {
        key: 'verifications.approve',
        label: 'Approve Verifications',
        description: 'Can approve/reject verification requests',
      },
    ],
  },
  {
    name: 'Contracts & Documents',
    description: 'Permissions for managing contracts and documents',
    permissions: [
      {
        key: 'contracts.view',
        label: 'View Contracts',
        description: 'Can view contracts and agreements',
      },
      {
        key: 'contracts.manage',
        label: 'Manage Contracts',
        description: 'Can create, edit, and manage contracts',
      },
      {
        key: 'documents.view',
        label: 'View Documents',
        description: 'Can view uploaded documents',
      },
      {
        key: 'documents.manage',
        label: 'Manage Documents',
        description: 'Can manage document verification and approval',
      },
    ],
  },
  {
    name: 'Finances',
    description: 'Permissions for managing financial aspects of the platform',
    permissions: [
      {
        key: 'finances.view',
        label: 'View Finances',
        description: 'Can view financial reports and transactions',
      },
      {
        key: 'finances.manage',
        label: 'Manage Finances',
        description: 'Can process payments and manage financial operations',
      },
    ],
  },
  {
    name: 'Service Providers',
    description: 'Permissions for managing service providers',
    permissions: [
      {
        key: 'providers.view',
        label: 'View Providers',
        description: 'Can view service provider accounts and services',
      },
      {
        key: 'providers.manage',
        label: 'Manage Providers',
        description: 'Can manage service provider operations',
      },
    ],
  },
  {
    name: 'Merchants',
    description: 'Permissions for managing merchant users',
    permissions: [
      {
        key: 'merchants.view',
        label: 'View Merchants',
        description: 'Can view merchant accounts and information',
      },
      {
        key: 'merchants.manage',
        label: 'Manage Merchants',
        description: 'Can manage merchant operations',
      },
    ],
  },
  {
    name: 'Deliverers',
    description: 'Permissions for managing delivery personnel',
    permissions: [
      {
        key: 'deliverers.view',
        label: 'View Deliverers',
        description: 'Can view deliverer accounts and information',
      },
      {
        key: 'deliverers.manage',
        label: 'Manage Deliverers',
        description: 'Can manage deliverer operations',
      },
    ],
  },
  {
    name: 'Warehouses',
    description: 'Permissions for warehouse management',
    permissions: [
      { key: 'warehouses.view', label: 'View Warehouses', description: 'Can view warehouse data' },
      {
        key: 'warehouses.manage',
        label: 'Manage Warehouses',
        description: 'Can manage warehouse operations',
      },
    ],
  },
  {
    name: 'Reports & Analytics',
    description: 'Permissions for viewing and exporting reports',
    permissions: [
      { key: 'reports.view', label: 'View Reports', description: 'Can view reports and analytics' },
      {
        key: 'reports.export',
        label: 'Export Reports',
        description: 'Can export reports and data',
      },
      {
        key: 'analytics.view',
        label: 'View Analytics',
        description: 'Can access platform analytics',
      },
    ],
  },
  {
    name: 'System',
    description: 'System-level permissions',
    permissions: [
      {
        key: 'system.settings',
        label: 'System Settings',
        description: 'Can modify system settings and configurations',
      },
      {
        key: 'activity-logs.view',
        label: 'View Activity Logs',
        description: 'Can view system and user activity logs',
      },
      {
        key: 'notifications.manage',
        label: 'Manage Notifications',
        description: 'Can manage system notifications',
      },
    ],
  },
];

interface UserPermissionsFormProps {
  userId: string;
  userRole: UserRole;
  initialPermissions?: string[];
}

export function UserPermissionsForm({
  userId,
  userRole,
  initialPermissions = [],
}: UserPermissionsFormProps) {
  const [permissions, setPermissions] = useState<string[]>(initialPermissions);
  const [isLoading, setIsLoading] = useState(false);
  const { updateUserPermissions } = useAdminUsers();

  // Only admins can have permissions
  const isAdmin = userRole === UserRole.ADMIN;

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    if (checked) {
      setPermissions([...permissions, permissionKey]);
    } else {
      setPermissions(permissions.filter(p => p !== permissionKey));
    }
  };

  // Check if a permission group is fully selected
  const isGroupSelected = (group: PermissionGroup) => {
    return group.permissions.every(p => permissions.includes(p.key));
  };

  // Check if a permission group is partially selected
  const isGroupIndeterminate = (group: PermissionGroup) => {
    const selectedCount = group.permissions.filter(p => permissions.includes(p.key)).length;
    return selectedCount > 0 && selectedCount < group.permissions.length;
  };

  // Toggle all permissions in a group
  const toggleGroup = (group: PermissionGroup, checked: boolean) => {
    if (checked) {
      // Add all permissions from this group
      const newPermissions = [...permissions];
      group.permissions.forEach(permission => {
        if (!newPermissions.includes(permission.key)) {
          newPermissions.push(permission.key);
        }
      });
      setPermissions(newPermissions);
    } else {
      // Remove all permissions from this group
      setPermissions(
        permissions.filter(p => !group.permissions.some(groupPerm => groupPerm.key === p))
      );
    }
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) {
      toast({
        title: 'Cannot set permissions',
        description: 'Only admin users can have permissions assigned',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPermissions(userId, permissions);
      toast({
        title: 'Permissions updated',
        description: 'User permissions have been successfully updated',
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error updating permissions',
        description: 'There was an error updating the user permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>Manage user permissions and access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <p className="text-muted-foreground">
              Permissions can only be assigned to admin users. Change the user role to admin first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Permissions</CardTitle>
        <CardDescription>
          Configure what this admin user can access and manage in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {permissionGroups.map(group => (
                <div key={group.name} className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.name}`}
                        checked={isGroupSelected(group)}
                        onCheckedChange={checked => toggleGroup(group, !!checked)}
                        {...(isGroupIndeterminate(group) ? { indeterminate: true } : {})}
                      />
                      <Label htmlFor={`group-${group.name}`} className="text-base font-semibold">
                        {group.name}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6 mt-1">{group.description}</p>
                  </div>
                  <div className="space-y-2 ml-6">
                    {group.permissions.map(permission => (
                      <div
                        key={permission.key}
                        className="flex items-center space-x-2 border-l-2 pl-4 py-1 border-primary/10"
                      >
                        <Checkbox
                          id={permission.key}
                          checked={permissions.includes(permission.key)}
                          onCheckedChange={checked =>
                            handlePermissionChange(permission.key, !!checked)
                          }
                        />
                        <div className="flex items-center">
                          <Label htmlFor={permission.key} className="font-medium">
                            {permission.label}
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground ml-1.5" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{permission.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button
          variant="ghost"
          onClick={() => setPermissions(initialPermissions)}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button onClick={handleSavePermissions} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Permissions'}
          {!isLoading && <Check className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
